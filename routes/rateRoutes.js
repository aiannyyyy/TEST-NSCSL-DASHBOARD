//rateRoutes.js
const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

// ✅ Route to get the top 20 unsatisfactory facilities (merged)
router.get("/rate-unsatisfactory", async (req, res) => {
    try {
        const connection = req.app.locals.oracleDb;
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: "Missing 'from' or 'to' date parameters" });
        }

        console.log(`🔍 Fetching top 20 unsatisfactory facilities from ${from} to ${to}`);

        const baseQuery = (tablePrefixSample, tablePrefixResult) => `
            SELECT 
                rpa."DESCR1" AS facility_name, 
                rpa."COUNTY" AS province,

                COUNT(DISTINCT CASE 
                    WHEN s."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                     AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI') 
                    THEN s."LABNO" 
                END) AS total_samples,  

                COUNT(DISTINCT CASE 
                    WHEN s."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                     AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI')
                    AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NDE', 'NE', 'E108') 
                    THEN s."LABNO" 
                END) AS unsatisfactory_count,  

                ROUND(
                    COUNT(DISTINCT CASE 
                        WHEN s."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                             AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI')
                        AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NDE', 'NE', 'E108') 
                        THEN s."LABNO" 
                    END) / 
                    NULLIF(COUNT(DISTINCT s."LABNO"), 0) * 100, 2
                ) AS unsat_rate 

            FROM 
                "PHMSDS"."REF_PROVIDER_ADDRESS" rpa
            JOIN 
                "PHMSDS"."${tablePrefixSample}" s 
                ON rpa."PROVIDERID" = s."SUBMID"
            JOIN 
                "PHMSDS"."${tablePrefixResult}" r 
                ON s."LABNO" = r."LABNO"
            JOIN 
                "PHMSDS"."LIB_DISORDER_RESULT" ldr 
                ON r."MNEMONIC" = ldr."MNEMONIC"
            WHERE 
                rpa."ADRS_TYPE" = '1'
                AND s."LABNO" NOT LIKE '_______8%'
                AND s."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                    AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI')

            GROUP BY 
                rpa."DESCR1", rpa."COUNTY"

            HAVING 
                COUNT(DISTINCT s."LABNO") >= 50  

            ORDER BY 
                unsat_rate DESC
        `;

        // ✅ Execute both queries
        const [archiveResult, masterResult] = await Promise.all([
            connection.execute(baseQuery("SAMPLE_DEMOG_ARCHIVE", "RESULT_ARCHIVE"), { date_from: from, date_to: to }, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
            connection.execute(baseQuery("SAMPLE_DEMOG_MASTER", "RESULT_MASTER"), { date_from: from, date_to: to }, { outFormat: oracledb.OUT_FORMAT_OBJECT })
        ]);

        let combinedRows = [...archiveResult.rows, ...masterResult.rows];

        // ✅ Sort by unsat_rate DESC and limit to top 20
        combinedRows.sort((a, b) => b.UNSAT_RATE - a.UNSAT_RATE);
        combinedRows = combinedRows.slice(0, 20);

        if (combinedRows.length === 0) {
            return res.status(404).json({ error: "No data found" });
        }

        console.log("✅ Combined query executed successfully. Rows fetched:", combinedRows.length);
        res.json(combinedRows);
    } catch (err) {
        console.error("❌ Database error:", err.message, err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

module.exports = router;
