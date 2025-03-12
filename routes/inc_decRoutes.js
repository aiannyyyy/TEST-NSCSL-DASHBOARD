const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

router.get("/monthly-labno-count", async (req, res) => {
    try {
        const connection = req.app.locals.oracleDb;
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        const { from, to, province } = req.query;
        if (!from || !to || !province) {
            return res.status(400).json({ error: "Missing 'from', 'to', or 'province' parameters" });
        }

        // ✅ Fix province formatting
        let provinceClean = province.trim().toUpperCase();

        // ✅ Debugging logs (to check hidden characters)
        console.log("🛠️ Debugging Parameters:");
        console.log("📌 From:", from);
        console.log("📌 To:", to);
        console.log("📌 Province (Raw):", JSON.stringify(province));
        console.log("📌 Province (Trimmed):", JSON.stringify(provinceClean));

        // ✅ Uncomment below for testing (Hardcode to 'BATANGAS' and check if it works)
        // provinceClean = "BATANGAS";

        const query = `
            SELECT 
                RPA."COUNTY" AS province, 
                TO_CHAR(SDA."DTRECV", 'YYYY-MM') AS month_year, 
                COUNT(SDA."LABNO") AS total_labno
            FROM 
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
            JOIN 
                "PHMSDS"."REF_PROVIDER_ADDRESS" RPA 
            ON 
                SDA."SUBMID" = RPA."PROVIDERID"
            WHERE 
                RPA."ADRS_TYPE" = '1'
                AND SDA."SPECTYPE" IN ('20')
                AND SDA."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') 
                                    AND TO_DATE(:date_to, 'YYYY-MM-DD')
                AND UPPER(RPA."COUNTY") LIKE UPPER(:province || '%') 
            GROUP BY 
                RPA."COUNTY", TO_CHAR(SDA."DTRECV", 'YYYY-MM')
            ORDER BY 
                RPA."COUNTY", month_year
        `;

        console.log("🔹 Executing SQL Query:\n", query);
        console.log("🔹 Query Parameters:", { date_from: from, date_to: to, province: provinceClean });

        const result = await connection.execute(
            query, 
            { date_from: from, date_to: to, province: provinceClean },  // ✅ Uses selected province
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );        

        console.log("✅ Query executed successfully. Rows fetched:", result.rows.length);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No data found for the selected province" });
        }

        res.json(result.rows);
    } catch (err) {
        console.error("❌ Database error:", err.message, err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

module.exports = router;
