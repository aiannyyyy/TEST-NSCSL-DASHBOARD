// for selecting by number

const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

router.get("/top-unsatisfactory", async (req, res) => {
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

        console.log(`🔍 Filtering data from ${from} to ${to}`);

        const query = `
            SELECT * FROM (
                SELECT 
                    rpa."DESCR1" AS facility_name, 
                    rpa."COUNTY" AS province, 
                    COUNT(DISTINCT sda."LABNO") AS unsatisfactory_count
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
                    AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108')
                    AND sda."LABNO" NOT LIKE '_______8%'
                    AND sda."DTRECV" >= TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI:SS')
                    AND sda."DTRECV" <= TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI:SS')
                GROUP BY 
                    rpa."DESCR1", rpa."COUNTY"
                ORDER BY 
                    unsatisfactory_count DESC
            ) WHERE ROWNUM <= 20
        `;
        
        const result = await connection.execute(
            query, 
            { date_from: from, date_to: to }, 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        

        console.log("🔹 Query executed successfully. Data:", result.rows);

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