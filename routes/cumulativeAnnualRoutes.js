const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/cumulative-annual-samples", async (req, res) => {
    console.log("🔹 API Request Received: /api/cumulative-annual-samples");

    const { category } = req.query;

    // Define valid category mappings
    const categories = {
        "Received": ["1", "87", "20", "2", "3", "4", "5", "18"],
        "Screened": ["4", "3", "20", "2", "1", "18", "87"]
    };

    // Validate category selection
    if (!category || !categories[category]) {
        return res.status(400).json({ error: "Invalid category selection" });
    }

    const spectypeValues = categories[category];

    let connection;
    try {
        connection = await getOracleConnection();

        const query = `
            SELECT 
                TO_CHAR(DTRECV, 'YYYY-MM') AS year_month, 
                SUM(COUNT(*)) OVER (ORDER BY TO_CHAR(DTRECV, 'YYYY-MM')) AS cumulative_samples,
                SUM(SUM(CASE 
                    WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4', '5') 
                    AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD') 
                                 AND TO_DATE('2018-12-31', 'YYYY-MM-DD') 
                    THEN 1 ELSE 0 END)) 
                OVER (ORDER BY TO_CHAR(DTRECV, 'YYYY-MM')) AS cumulative_test_6,
                SUM(SUM(CASE 
                    WHEN SPECTYPE IN ('1', '18', '87', '2', '3', '4') 
                    AND DTRECV BETWEEN TO_DATE('2013-09-24', 'YYYY-MM-DD') 
                                 AND TO_DATE('2018-12-31', 'YYYY-MM-DD') 
                    THEN 1 ELSE 0 END)) 
                OVER (ORDER BY TO_CHAR(DTRECV, 'YYYY-MM')) AS cumulative_test_6_screened,
                SUM(SUM(CASE 
                    WHEN SPECTYPE IN ('20', '2', '3', '4', '5', '87') 
                    AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD') 
                    THEN 1 ELSE 0 END)) 
                OVER (ORDER BY TO_CHAR(DTRECV, 'YYYY-MM')) AS cumulative_enbs,
                SUM(SUM(CASE 
                    WHEN SPECTYPE IN ('20', '2', '3', '4', '87')  
                    AND DTRECV >= TO_DATE('2018-07-16', 'YYYY-MM-DD') 
                    THEN 1 ELSE 0 END)) 
                OVER (ORDER BY TO_CHAR(DTRECV, 'YYYY-MM')) AS cumulative_enbs_screened
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE SPECTYPE IN (${spectypeValues.map((_, i) => `:spectype${i}`).join(", ")})
            GROUP BY TO_CHAR(DTRECV, 'YYYY-MM')
            ORDER BY year_month ASC
        `;

        const params = spectypeValues.reduce((acc, val, i) => ({ ...acc, [`spectype${i}`]: val }), {});

        console.log("🔹 Executing Query:", query);
        console.log("🔹 Parameters:", params);

        const result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

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
