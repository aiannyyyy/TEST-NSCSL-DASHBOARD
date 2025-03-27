const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/cumulative-annual-samples", async (req, res) => {
    console.log("🔹 API Request Received: /api/cumulative-annual-samples");

    let connection;

    try {
        connection = await getOracleConnection();

        const yearlyQuery = `
            SELECT 
                TO_CHAR(DTRECV, 'YYYY') AS year, 
                TO_CHAR(DTRECV, 'MM') AS month,
                COUNT(labno) AS total_samples,
                SUM(CASE WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4', '5') 
                         AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD') 
                                         AND TO_DATE('2018-12-31', 'YYYY-MM-DD') 
                         THEN 1 ELSE 0 END) AS test_6,
                SUM(CASE WHEN SPECTYPE IN ('20', '2', '3', '4', '5', '87') 
                         AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD') 
                         THEN 1 ELSE 0 END) AS enbs
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE DTRECV IS NOT NULL
            AND SPECTYPE IN ('1', '20', '2', '3', '4', '5', '87', '18')  
            GROUP BY TO_CHAR(DTRECV, 'YYYY'), TO_CHAR(DTRECV, 'MM')
            ORDER BY year ASC, month ASC
        `;

        console.log("🔹 Executing Query:", yearlyQuery);

        const yearlyResults = await connection.execute(yearlyQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        console.log("✅ Query Results:", yearlyResults.rows);

        // Format data in the structure your chart expects
        const yearlyData = {};

        yearlyResults.rows.forEach(row => {
            const year = row.YEAR;
            const month = parseInt(row.MONTH, 10);

            if (!yearlyData[year]) {
                yearlyData[year] = {
                    year: parseInt(year, 10),
                    total_samples: 0,
                    test_6: 0,
                    enbs: 0
                };
            }

            yearlyData[year][`test_6_${month}`] = row.TEST_6;
            yearlyData[year][`enbs_${month}`] = row.ENBS;
        });

        res.json({ yearlyData: Object.values(yearlyData) });

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
