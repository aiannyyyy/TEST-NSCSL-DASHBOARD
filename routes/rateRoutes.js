const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

// ✅ Route to get the top 20 unsatisfactory facilities
router.get("/rate-unsatisfactory", async (req, res) => {
    try {
        // ✅ Get Oracle connection from app.locals
        const connection = req.app.locals.oracleDb;
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        // ✅ Get query parameters
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: "Missing 'from' or 'to' date parameters" });
        }

        console.log(`🔍 Fetching top 20 unsatisfactory facilities from ${from} to ${to}`);

        const query = `
        SELECT * FROM (
            SELECT 
                rpa."DESCR1" AS facility_name, 
                rpa."COUNTY" AS province,
    
                COUNT(DISTINCT CASE 
                    WHEN sda."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                         AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI') 
                    THEN sda."LABNO" 
                END) AS total_samples,  
    
                COUNT(DISTINCT CASE 
                    WHEN sda."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                         AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI')
                    AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NDE', 'NE', 'E108') 
                    THEN sda."LABNO" 
                END) AS unsatisfactory_count,  
    
                ROUND(
                    COUNT(DISTINCT CASE 
                        WHEN sda."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                             AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI')
                        AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NDE', 'NE', 'E108') 
                        THEN sda."LABNO" 
                    END) / 
                    NULLIF(COUNT(DISTINCT sda."LABNO"), 0) * 100, 2
                ) AS unsat_rate 
    
            FROM 
                "PHMSDS"."REF_PROVIDER_ADDRESS" rpa
            JOIN 
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sda 
                ON rpa."PROVIDERID" = sda."SUBMID"
            JOIN 
                "PHMSDS"."RESULT_ARCHIVE" ra 
                ON sda."LABNO" = ra."LABNO"
            JOIN 
                "PHMSDS"."LIB_DISORDER_RESULT" ldr 
                ON ra."MNEMONIC" = ldr."MNEMONIC"
            WHERE 
                rpa."ADRS_TYPE" = '1'
                AND sda."LABNO" NOT LIKE '_______8%'
                AND sda."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI') 
                                    AND TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI')
    
            GROUP BY 
                rpa."DESCR1", rpa."COUNTY"
    
            HAVING 
                COUNT(DISTINCT sda."LABNO") >= 50  
    
            ORDER BY 
                unsat_rate DESC
        ) 
        WHERE ROWNUM <= 20
    `;    

        // ✅ Execute Query with Bind Variables
        const result = await connection.execute(
            query, 
            { date_from: from, date_to: to }, 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log("✅ Query executed successfully. Rows fetched:", result.rows.length);

        // ✅ Check if data is available
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No data found" });
        }

        res.json(result.rows);
    } catch (err) {
        console.error("❌ Database error:", err.message, err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

module.exports = router;
