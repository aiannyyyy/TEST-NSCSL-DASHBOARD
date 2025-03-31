const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/cumulative-annual-samples", async (req, res) => {
    console.log("🔹 API Request Received: /api/cumulative-annual-samples");

    let connection;
    try {
        connection = await getOracleConnection();

        const query = `
           SELECT 
                TO_CHAR(DTRECV, 'YYYY-MM') AS year_month, 
                COUNT(labno) AS total_samples,
                SUM(CASE WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4', '5') 
                        AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD') 
                                        AND TO_DATE('2018-12-31', 'YYYY-MM-DD') 
                        THEN 1 ELSE 0 END) AS test_6,
                SUM(CASE WHEN SPECTYPE IN ('20', '2', '3', '4', '5', '87') 
                        AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD') 
                        THEN 1 ELSE 0 END) AS enbs
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE SPECTYPE IN ('1', '20', '2', '3', '4', '5', '87', '18')  
                AND DTRECV IS NOT NULL
            GROUP BY TO_CHAR(DTRECV, 'YYYY-MM')
            ORDER BY year_month ASC
        `;

        console.log("🔹 Executing Query:", query);

        const result = await connection.execute(query, [], { 
            outFormat: oracledb.OUT_FORMAT_OBJECT 
        });

        console.log("✅ Query Results:", result.rows);
        res.json({ data: result.rows });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("❌ Error closing connection:", err);
            }
        }
    }
});

module.exports = router;
