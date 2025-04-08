const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb;

        if (!oracleDb) {
            return res.status(500).json({ error: "OracleDB is not connected" });
        }

        // 📦 SQL Queries
        const queryTemplate = (column) => `
            SELECT
                u."FIRSTNAME",
                COUNT(DISTINCT sa."LABNO") AS total_labno_count
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sa
            JOIN
                "PHSECURE"."USERS" u ON sa."${column}" = u."USER_ID"
            WHERE
                sa."DTRECV" BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)
                AND u."FIRSTNAME" IN ('ABIGAIL', 'ANGELICA', 'JAY ARR', 'Mary Rose')
            GROUP BY
                u."FIRSTNAME"
            ORDER BY
                u."FIRSTNAME"
        `;

        // 📊 Execute entry and verification queries
        const [entryResult, verificationResult] = await Promise.all([
            oracleDb.execute(queryTemplate("INIT_TECH")),
            oracleDb.execute(queryTemplate("VER_TECH"))
        ]);

        // 🛠️ Process results
        const mapResults = (rows) => rows.reduce((acc, [firstname, count]) => {
            acc[firstname] = count;
            return acc;
        }, {});

        const entryMap = mapResults(entryResult.rows);
        const verificationMap = mapResults(verificationResult.rows);

        // 🧾 Build response with full names
        res.json({
            entry: {
                "Jay Arr Apelado": entryMap["JAY ARR"] || 0,
                "Angelica Brutas": entryMap["ANGELICA"] || 0,
                "Mary Rose Gomez": entryMap["Mary Rose"] || 0,
                "Abigail Morfe": entryMap["ABIGAIL"] || 0
            },
            verification: {
                "Apelado Jay Arr": verificationMap["JAY ARR"] || 0,
                "Brutas Angelica": verificationMap["ANGELICA"] || 0,
                "Gomez Mary Rose": verificationMap["Mary Rose"] || 0,
                "Morfe Abigail": verificationMap["ABIGAIL"] || 0
            }
        });

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

module.exports = router;
