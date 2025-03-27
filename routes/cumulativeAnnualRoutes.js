const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/cumulative-annual-samples", async (req, res) => {
    console.log("🔹 API Request Received: /api/cumulative-annual-samples");

    let connection;

    try {
        connection = await getOracleConnection();

        // Optimized SQL Query
        const yearlyQuery = `
            SELECT 
                TO_CHAR(DTRECV, 'YYYY') AS year, 
                COUNT(labno) AS total_samples,
                SUM(CASE WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4', '5') 
                          AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD') 
                                        AND TO_DATE('2018-12-31', 'YYYY-MM-DD') 
                         THEN 1 ELSE 0 END) AS test_6,
                SUM(CASE WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4') 
                          AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD') 
                                        AND TO_DATE('2018-12-31', 'YYYY-MM-DD') 
                         THEN 1 ELSE 0 END) AS test_6_screened,
                SUM(CASE WHEN SPECTYPE IN ('20', '2', '3', '4', '5', '87') 
                          AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD') 
                         THEN 1 ELSE 0 END) AS enbs,
                SUM(CASE WHEN SPECTYPE IN ('20', '2', '3', '4', '87') 
                          AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD') 
                         THEN 1 ELSE 0 END) AS enbs_screened
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE DTRECV IS NOT NULL
            AND SPECTYPE IN ('1', '20', '2', '3', '4', '5', '87', '18')  
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
            test_6: row.TEST_6,  
            test_6_screened: row.TEST_6_SCREENED,  
            enbs: row.ENBS,       
            enbs_screened: row.ENBS_SCREENED
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
