const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/cumulative-annual-samples", async (req, res) => {
    console.log("🔹 API Request Received: /api/cumulative-annual-samples");

    let connection;

    try {
        connection = await getOracleConnection();
        const sampleType = req.query.type ? req.query.type.trim() : "Received";
        console.log("🔹 Requested Sample Type:", sampleType);

        // Define SPECTYPE values
        const spectypeMapping = {
            "Received": ["1", "87", "20", "2", "3", "4", "5"],
            "Screened": ["4", "3", "20", "2", "1"],
        };

        // Get unique SPECTYPE values based on sampleType
        let spectypeValues = [...new Set([...spectypeMapping[sampleType] || [], "1", "20"])];

        console.log("🔹 Spectype Values:", spectypeValues);

        // Convert array to a formatted string for SQL query
        const spectypeValuesStr = spectypeValues.map(val => `'${val}'`).join(", ");

        // Query: Yearly totals for total, 5-Test, and ENBS
        const yearlyQuery = `
            SELECT 
                TO_CHAR(DTRECV, 'YYYY') AS year, 
                COUNT(labno) AS total_samples,
                SUM(CASE WHEN SPECTYPE = '1' THEN 1 ELSE 0 END) AS test_5,
                SUM(CASE WHEN SPECTYPE = '20' THEN 1 ELSE 0 END) AS enbs
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE SPECTYPE IN (${spectypeValuesStr}) 
            AND DTRECV IS NOT NULL
            GROUP BY TO_CHAR(DTRECV, 'YYYY')
            ORDER BY year ASC
        `;

        console.log("🔹 Executing Query:", yearlyQuery);

        // Execute query
        const yearlyResults = await connection.execute(yearlyQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        console.log("✅ Query Results:", yearlyResults.rows);

        // Format data
        const yearlyData = yearlyResults.rows.map(row => ({
            year: parseInt(row.YEAR, 10), // Ensure year is a number
            total_samples: row.TOTAL_SAMPLES,
            test_5: row.TEST_5,  // Gray
            enbs: row.ENBS       // Orange
        }));

        console.log("✅ Processed Data:", yearlyData);

        res.json({ yearlyData });

    } catch (error) {
        console.error("❌ Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("❌ Error closing Oracle connection:", err);
            }
        }
    }
});

module.exports = router;
