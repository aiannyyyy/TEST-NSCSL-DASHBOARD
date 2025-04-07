const express = require("express");
const router = express.Router();

// ✅ Route to Get Total LABNO Count per Name for Entry and Verification
router.get("/", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb; // ✅ Get Oracle connection

        if (!oracleDb) {
            return res.status(500).json({ error: "OracleDB is not connected" });
        }

        // ✅ SQL Query for Entry
        const entryQuery = `
            SELECT
                u."FIRSTNAME",
                COUNT(DISTINCT sa."LABNO") AS total_labno_count
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sa
            JOIN
                "PHSECURE"."USERS" u ON sa."VER_TECH" = u."USER_ID" -- Joining on VER_TECH with USER_ID for entry
            WHERE
                sa."DTRECV" >= TO_TIMESTAMP('2025-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS') AND
                sa."DTRECV" < TO_TIMESTAMP('2025-01-31 00:00:01', 'YYYY-MM-DD HH24:MI:SS') AND
                u."FIRSTNAME" IN ('ABIGAIL', 'ANGELICA', 'JAY ARR', 'Mary Rose')
            GROUP BY
                u."FIRSTNAME"
            ORDER BY
                u."FIRSTNAME"
        `;

        // ✅ SQL Query for Verification
        const verificationQuery = `
            SELECT
                u."FIRSTNAME",
                COUNT(DISTINCT sa."LABNO") AS total_labno_count
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sa
            JOIN
                "PHSECURE"."USERS" u ON sa."VER_TECH" = u."USER_ID" -- Joining on VER_TECH with USER_ID for verification
            WHERE
                sa."DTRECV" >= TO_TIMESTAMP('2025-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS') AND
                sa."DTRECV" < TO_TIMESTAMP('2025-01-31 00:00:01', 'YYYY-MM-DD HH24:MI:SS') AND
                u."FIRSTNAME" IN ('ABIGAIL', 'ANGELICA', 'JAY ARR', 'Mary Rose')
            GROUP BY
                u."FIRSTNAME"
            ORDER BY
                u."FIRSTNAME"
        `;

        // ✅ Execute Entry Query
        const entryResult = await oracleDb.execute(entryQuery);

        // ✅ Execute Verification Query
        const verificationResult = await oracleDb.execute(verificationQuery);

        // ✅ Process Results
        const entryData = entryResult.rows.map(row => ({
            FIRSTNAME: row[0], // The FIRSTNAME
            total_labno_count: row[1], // The total labno count for entry
        }));

        const verificationData = verificationResult.rows.map(row => ({
            FIRSTNAME: row[0], // The FIRSTNAME
            total_labno_count: row[1], // The total labno count for verification
        }));

        // ✅ Send Combined Response with both entry and verification data
        res.json({
            entry: {
                "Jay Arr Apelado": entryData.find(person => person.FIRSTNAME === 'JAY ARR')?.total_labno_count || 0,
                "Angelica Brutas": entryData.find(person => person.FIRSTNAME === 'ANGELICA')?.total_labno_count || 0,
                "Mary Rose Gomez": verificationData.find(person => person.FIRSTNAME === 'Mary Rose')?.total_labno_count || 0,
                "Abigail Morfe": verificationData.find(person => person.FIRSTNAME === 'ABIGAIL')?.total_labno_count || 0
            },
            verification: {
                "Jay Arr Apelado": verificationData.find(person => person.FIRSTNAME === 'JAY ARR')?.total_labno_count || 0,
                "Angelica Brutas": verificationData.find(person => person.FIRSTNAME === 'ANGELICA')?.total_labno_count || 0,
                "Mary Rose Gomez": verificationData.find(person => person.FIRSTNAME === 'Mary Rose')?.total_labno_count || 0,
                "Abigail Morfe": verificationData.find(person => person.FIRSTNAME === 'ABIGAIL')?.total_labno_count || 0
            }
        });

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

module.exports = router;
