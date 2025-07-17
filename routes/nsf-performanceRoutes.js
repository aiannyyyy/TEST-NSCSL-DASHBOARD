const express = require('express');
const router = express.Router();

router.get("/nsf-performance", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb;

        const county = req.query.county;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;

        if (!oracleDb) return res.status(500).json({ error: "OracleDB is not connected" });

        if (!county || !dateFrom || !dateTo) {
            return res.status(400).json({ error: "Missing one or more required query parameters: county, dateFrom, dateTo" });
        }

        const query = `
            SELECT
                sda.SUBMID,
                rpa.DESCR1 AS FACILITY_NAME,
                COUNT(DISTINCT sda.LABNO) AS TOTAL_SAMPLE_COUNT,
                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP = sda.SUBMID THEN sda.LABNO END) AS TOTAL_INBORN,
                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP = 'HOME' THEN sda.LABNO END) AS TOTAL_HOMEBIRTH,
                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP NOT IN ('HOME', 'UNK') AND sda.BIRTHHOSP <> sda.SUBMID THEN sda.LABNO END) AS TOTAL_HOB,
                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP = 'UNK' THEN sda.LABNO END) AS TOTAL_UNKNOWN,

                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP = 'HOME' THEN sda.LABNO END) +
                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP NOT IN ('HOME', 'UNK') AND sda.BIRTHHOSP <> sda.SUBMID THEN sda.LABNO END) +
                COUNT(DISTINCT CASE WHEN sda.BIRTHHOSP = 'UNK' THEN sda.LABNO END) AS OUTBORN_TOTAL,

                COUNT(DISTINCT CASE WHEN ldr.MNEMONIC = 'E100' THEN sda.LABNO END) AS MISSING_INFORMATION,
                COUNT(DISTINCT CASE WHEN ldr.MNEMONIC = 'E102' THEN sda.LABNO END) AS LESS_THAN_24_HOURS,
                COUNT(DISTINCT CASE WHEN ldr.MNEMONIC = 'E108' THEN sda.LABNO END) AS INSUFFICIENT,
                COUNT(DISTINCT CASE WHEN ldr.MNEMONIC = 'E109' THEN sda.LABNO END) AS CONTAMINATED,
                COUNT(DISTINCT CASE WHEN ldr.MNEMONIC = 'DE' THEN sda.LABNO END) AS DATA_ERASURES,

                COUNT(DISTINCT CASE WHEN ldr.MNEMONIC IN ('E100', 'E102', 'E108', 'E109', 'DE') THEN sda.LABNO END) AS TOTAL_UNSAT_COUNT,

                ROUND(
                    COUNT(DISTINCT CASE WHEN ldr.MNEMONIC IN ('E100', 'E102', 'E108', 'E109', 'DE') THEN sda.LABNO END) * 100.0
                    / NULLIF(COUNT(DISTINCT sda.LABNO), 0),
                    2
                ) AS TOTAL_UNSAT_RATE,

                ROUND(AVG(CASE WHEN sda.SPECTYPE IN (20, 87) THEN sda.AGECOLL / 24 END), 2) AS AVE_AOC,
                ROUND(AVG(sda.DTRECV - sda.DTCOLL), 2) AS TRANSIT_TIME,
                ROUND(AVG(CASE WHEN sda.BIRTHHOSP = sda.SUBMID AND sda.SPECTYPE IN (20, 87) THEN sda.AGECOLL / 24 END), 2) AS INBORN_AVERAGE,
                ROUND(AVG(CASE WHEN sda.BIRTHHOSP <> sda.SUBMID AND sda.SPECTYPE IN (20, 87) THEN sda.AGECOLL / 24 END), 2) AS OUTBORN_AVERAGE

            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
            JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa 
                ON rpa.PROVIDERID = sda.SUBMID AND rpa.ADRS_TYPE = '1'
            JOIN PHMSDS.RESULT_ARCHIVE ra 
                ON sda.LABNO = ra.LABNO
            JOIN PHMSDS.LIB_DISORDER_RESULT ldr 
                ON ra.MNEMONIC = ldr.MNEMONIC
            WHERE
                sda.DTRECV BETWEEN TO_DATE(:dateFrom, 'YYYY-MM-DD') AND TO_DATE(:dateTo || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                AND sda.LABNO NOT LIKE '_______8%'
                AND rpa.COUNTY = :county
            GROUP BY
                sda.SUBMID,
                rpa.COUNTY,
                rpa.DESCR1
            ORDER BY
                sda.SUBMID, rpa.DESCR1
        `;

        const binds = {
            county,
            dateFrom,
            dateTo
        };

        const result = await oracleDb.execute(query, binds, { outFormat: oracleDb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
