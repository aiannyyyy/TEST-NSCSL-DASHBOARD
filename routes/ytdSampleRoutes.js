const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/ytd-sample-comparison", async (req, res) => {
    const { year1, year2, type } = req.query;

    const validTypes = {
        "Received": ["1", "87", "20", "2", "3", "4", "5"],
        "Screened": ["4", "3", "20", "2", "1"]
    };

    if (!validTypes[type.trim()]) {
        return res.status(400).json({ error: "Invalid type. Use 'Received' or 'Screened'." });
    }

    const spectypeValues = validTypes[type.trim()];

    let connection;
    try {
        connection = await getOracleConnection(); // ✅ Get Oracle connection
        if (!connection) {
            return res.status(500).json({ error: "Database connection failed" });
        }

        // ✅ Check if the required table exists
        const checkTableQuery = `SELECT COUNT(*) FROM all_tables WHERE table_name = 'SAMPLE_DEMOG_ARCHIVE' AND owner = 'PHMSDS'`;
        const checkTableResult = await connection.execute(checkTableQuery);
        if (checkTableResult.rows[0][0] === 0) {
            return res.status(400).json({ error: "Table SAMPLE_DEMOG_ARCHIVE does not exist in PHMSDS." });
        }

        // ✅ Main Query
        const query = `
            SELECT EXTRACT(MONTH FROM DTRECV) AS month, 
                   EXTRACT(YEAR FROM DTRECV) AS year, 
                   COUNT(*) AS total_samples
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE EXTRACT(YEAR FROM DTRECV) IN (:year1, :year2) 
            AND SPECTYPE IN (${spectypeValues.map((_, i) => `:spectype${i}`).join(", ")})
            GROUP BY EXTRACT(YEAR FROM DTRECV), EXTRACT(MONTH FROM DTRECV)
            ORDER BY year, month
        `;

        const params = { year1, year2 };
        spectypeValues.forEach((val, i) => (params[`spectype${i}`] = val));

        const result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

module.exports = router;
