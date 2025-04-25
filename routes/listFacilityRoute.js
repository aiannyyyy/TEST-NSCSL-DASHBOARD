const express = require("express");
const router = express.Router();
const db = require("../config/oracleConnection");

router.get("/", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb;

        if (!oracleDb) {
            return res.status(500).json({ error: "OracleDB is not connected" });
        }

        const { facilitycode } = req.query;

        let query = `
            SELECT 
                PROVIDERID AS facilitycode, 
                ADRS_TYPE AS adrs_type, 
                DESCR1 AS facilityname
            FROM PHMSDS.REF_PROVIDER_ADDRESS 
            WHERE ADRS_TYPE = '1'
        `;

        const binds = [];

        if (facilitycode) {
            query += ` AND PROVIDERID = :facilitycode`;
            binds.push(facilitycode);
        }

        const result = await oracleDb.execute(query, binds, {
            outFormat: db.OBJECT // Make sure 'db.OBJECT' is correctly configured
        });

        // Return only the data fields
        res.json(result.rows || []);
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

module.exports = router;
