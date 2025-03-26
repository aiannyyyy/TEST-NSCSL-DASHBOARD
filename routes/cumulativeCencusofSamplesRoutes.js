const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/cumulative-census-samples", async (req, res) => {
    console.log("🔹 Request received for /cumulative-census-samples");
    console.log("🔹 Query Params:", req.query);

    const { type } = req.query;

    const validTypes = {
        "Received": ["1", "87", "20", "2", "3", "4", "5"],
        "Screened": ["4", "3", "20", "2", "1"]
    };

    if (!type || !validTypes[type.trim()]) {
        console.log("❌ Invalid type:", type);
        return res.status(400).json({ error: "Invalid type. Use 'Received' or 'Screened'." });
    }

    let connection;
    try {
        connection = await getOracleConnection();
        if (!connection) {
            console.log("❌ Database connection failed.");
            return res.status(500).json({ error: "Database connection failed" });
        }

        console.log("✅ Database connection successful");

        const spectypeValues = validTypes[type.trim()];
        console.log("🔹 Spectype Values:", spectypeValues);

        const query = `
            SELECT EXTRACT(MONTH FROM DTRECV) AS month, 
                   EXTRACT(YEAR FROM DTRECV) AS year, 
                   COUNT(*) AS total_samples
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE SPECTYPE IN (${spectypeValues.map((_, i) => `:spectype${i}`).join(", ")})
            GROUP BY EXTRACT(YEAR FROM DTRECV), EXTRACT(MONTH FROM DTRECV)
            ORDER BY year, month
        `;

        const params = {};
        spectypeValues.forEach((val, i) => (params[`spectype${i}`] = val));

        console.log("🔹 Executing Query:", query);
        console.log("🔹 Query Parameters:", params);

        const result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        console.log("✅ Query executed successfully");
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});


module.exports = router;
