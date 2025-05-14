/*

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

*/

const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb;

        if (!oracleDb) {
            return res.status(500).json({ error: "OracleDB is not connected" });
        }

        // ✅ SQL Templates
        const queryTemplateArchive = (column) => `
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
        `;

        const queryTemplateMaster = (column) => `
            SELECT
                u."FIRSTNAME",
                COUNT(DISTINCT sm."LABNO") AS total_labno_count
            FROM
                "PHMSDS"."SAMPLE_DEMOG_MASTER" sm
            JOIN
                "PHSECURE"."USERS" u ON sm."${column}" = u."USER_ID"
            WHERE
                sm."DTRECV" BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)
                AND u."FIRSTNAME" IN ('ABIGAIL', 'ANGELICA', 'JAY ARR', 'Mary Rose')
            GROUP BY
                u."FIRSTNAME"
        `;

        // ✅ Execute all four queries
        const [
            archiveEntryResult,
            archiveVerificationResult,
            masterEntryResult,
            masterVerificationResult
        ] = await Promise.all([
            oracleDb.execute(queryTemplateArchive("INIT_TECH")),
            oracleDb.execute(queryTemplateArchive("VER_TECH")),
            oracleDb.execute(queryTemplateMaster("INIT_TECH")),
            oracleDb.execute(queryTemplateMaster("VER_TECH"))
        ]);

        // ✅ Map and merge results
        const mapResults = (rows) =>
            rows.reduce((acc, [firstname, count]) => {
                acc[firstname] = (acc[firstname] || 0) + count;
                return acc;
            }, {});

        const entryMap = {
            ...mapResults(archiveEntryResult.rows),
            ...mapResults(masterEntryResult.rows)
        };

        const verificationMap = {
            ...mapResults(archiveVerificationResult.rows),
            ...mapResults(masterVerificationResult.rows)
        };

        // ✅ Sum counts from both sources
        const sumMaps = (map1, map2) => {
            const result = {};
            const keys = new Set([...Object.keys(map1), ...Object.keys(map2)]);
            for (const key of keys) {
                result[key] = (map1[key] || 0) + (map2[key] || 0);
            }
            return result;
        };

        const totalEntry = sumMaps(
            mapResults(archiveEntryResult.rows),
            mapResults(masterEntryResult.rows)
        );

        const totalVerification = sumMaps(
            mapResults(archiveVerificationResult.rows),
            mapResults(masterVerificationResult.rows)
        );

        // ✅ Build final response
        res.json({
            entry: {
                "Jay Arr Apelado": totalEntry["JAY ARR"] || 0,
                "Angelica Brutas": totalEntry["ANGELICA"] || 0,
                "Mary Rose Gomez": totalEntry["Mary Rose"] || 0,
                "Abigail Morfe": totalEntry["ABIGAIL"] || 0
            },
            verification: {
                "Apelado Jay Arr": totalVerification["JAY ARR"] || 0,
                "Brutas Angelica": totalVerification["ANGELICA"] || 0,
                "Gomez Mary Rose": totalVerification["Mary Rose"] || 0,
                "Morfe Abigail": totalVerification["ABIGAIL"] || 0
            }
        });

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

module.exports = router;