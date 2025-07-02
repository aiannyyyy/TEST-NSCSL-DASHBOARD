/*
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
                AND SDA."SPECTYPE" IN ('4', '3', '20', '2", '1', '87')
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

*/
const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

router.get("/monthly-labno-count", async (req, res) => {
    try {
        const connection = req.app.locals.oracleDb;
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        const { from, to, province, type } = req.query;
        if (!from || !to || !province || !type) {
            return res.status(400).json({ error: "Missing required parameters: 'from', 'to', 'province', or 'type'" });
        }

        // ✅ Define valid types with their corresponding spectypes
        const validTypes = {
            "Received": ["1", "87", "20", "2", "3", "4", "5", "18"],
            "Screened": ["4", "3", "20", "2", "1", "87"]
        };

        // ✅ Validate type parameter
        if (!validTypes[type.trim()]) {
            console.log("❌ Invalid type:", type);
            return res.status(400).json({ 
                error: "Invalid type. Use 'Received' or 'Screened'.",
                validTypes: Object.keys(validTypes)
            });
        }

        // ✅ Get spectypes for the selected type
        const spectypeValues = validTypes[type.trim()];
        
        // ✅ Fix province formatting
        let provinceClean = province.trim().toUpperCase();

        // ✅ Debugging logs
        console.log("🛠️ Debugging Parameters:");
        console.log("📌 From:", from);
        console.log("📌 To:", to);
        console.log("📌 Province (Raw):", JSON.stringify(province));
        console.log("📌 Province (Trimmed):", JSON.stringify(provinceClean));
        console.log("📌 Type:", type);
        console.log("📌 Spectype Values:", spectypeValues);

        // ✅ Create IN clause placeholders for spectypes
        const spectypePlaceholders = spectypeValues.map((_, index) => `:spectype${index}`).join(', ');

        const query = `
            SELECT 
                RPA."COUNTY" AS province, 
                TO_CHAR(SDA."DTRECV", 'YYYY-MM') AS month_year,
                EXTRACT(MONTH FROM SDA."DTRECV") AS month,
                EXTRACT(YEAR FROM SDA."DTRECV") AS year,
                COUNT(SDA."LABNO") AS total_labno,
                COUNT(*) AS total_samples,
                SDA."SPECTYPE",
                :type_param AS category
            FROM 
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
            JOIN 
                "PHMSDS"."REF_PROVIDER_ADDRESS" RPA 
            ON 
                SDA."SUBMID" = RPA."PROVIDERID"
            WHERE 
                RPA."ADRS_TYPE" = '1'
                AND SDA."SPECTYPE" IN (${spectypePlaceholders})
                AND SDA."DTRECV" BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') 
                                    AND TO_DATE(:date_to, 'YYYY-MM-DD')
                AND UPPER(RPA."COUNTY") LIKE UPPER(:province || '%') 
            GROUP BY 
                RPA."COUNTY", 
                TO_CHAR(SDA."DTRECV", 'YYYY-MM'),
                EXTRACT(MONTH FROM SDA."DTRECV"),
                EXTRACT(YEAR FROM SDA."DTRECV"),
                SDA."SPECTYPE"
            ORDER BY 
                year, month, RPA."COUNTY", SDA."SPECTYPE"
        `;

        // ✅ Build bind parameters object
        const bindParams = {
            date_from: from,
            date_to: to,
            province: provinceClean,
            type_param: type.trim()
        };

        // ✅ Add spectype array parameters
        spectypeValues.forEach((value, index) => {
            bindParams[`spectype${index}`] = value;
        });

        console.log("🔹 Executing SQL Query:\n", query);
        console.log("🔹 Query Parameters:", bindParams);

        const result = await connection.execute(
            query, 
            bindParams,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );        

        console.log("✅ Query executed successfully. Rows fetched:", result.rows.length);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No data found for the selected province, type, and date range",
                searchCriteria: {
                    province: provinceClean,
                    type: type.trim(),
                    spectypes: spectypeValues,
                    dateRange: { from, to }
                }
            });
        }

        // ✅ Group results by month for easier consumption
        const monthlyData = result.rows.reduce((acc, row) => {
            const key = `${row.YEAR}-${String(row.MONTH).padStart(2, '0')}`;
            if (!acc[key]) {
                acc[key] = {
                    year: row.YEAR,
                    month: row.MONTH,
                    month_year: row.MONTH_YEAR,
                    province: row.PROVINCE,
                    category: row.CATEGORY,
                    total_samples: 0,
                    total_labno: 0,
                    spectypes: []
                };
            }
            acc[key].total_samples += row.TOTAL_SAMPLES;
            acc[key].total_labno += row.TOTAL_LABNO;
            acc[key].spectypes.push({
                spectype: row.SPECTYPE,
                samples: row.TOTAL_SAMPLES,
                labno: row.TOTAL_LABNO
            });
            return acc;
        }, {});

        res.json({
            parameters: {
                type: type.trim(),
                spectypes: spectypeValues,
                province: provinceClean,
                dateRange: { from, to }
            },
            monthlyData: Object.values(monthlyData),
            rawData: result.rows,
            summary: {
                totalRecords: result.rows.length,
                totalSamples: result.rows.reduce((sum, row) => sum + row.TOTAL_SAMPLES, 0),
                totalLabNo: result.rows.reduce((sum, row) => sum + row.TOTAL_LABNO, 0)
            }
        });

    } catch (err) {
        console.error("❌ Database error:", err.message, err);
        res.status(500).json({ 
            error: "Database error", 
            details: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;