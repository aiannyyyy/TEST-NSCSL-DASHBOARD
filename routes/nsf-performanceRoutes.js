const express = require('express');
const router = express.Router();
const db = require("../config/oracleConnection");

router.get("/nsf-performance", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb;

        if (!oracleDb) {
            console.error("[DB ERROR] OracleDB not connected");
            return res.status(500).json({ error: "OracleDB is not connected" });
        }

        const county = req.query.county?.toUpperCase();
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;

        if (!county || !dateFrom || !dateTo) {
            console.warn("[MISSING PARAMS]", { county, dateFrom, dateTo });
            return res.status(400).json({
                error: "Missing one or more required query parameters: county, dateFrom, dateTo"
            });
        }

        console.log("[REQUEST PARAMS]", { county, dateFrom, dateTo });

        /*
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
                rpa.ADRS_TYPE = '1'
                AND sda.DTRECV BETWEEN TO_DATE(:dateFrom, 'YYYY-MM-DD') 
                AND TO_DATE(:dateTo || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                AND sda.LABNO NOT LIKE '_______8%'
                AND TRIM(rpa.COUNTY) = :county

            GROUP BY sda.SUBMID, rpa.COUNTY, rpa.DESCR1
            ORDER BY sda.SUBMID, rpa.DESCR1
        `;
        */
        const query = `WITH filtered_sda AS (
                    SELECT *
                    FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                    WHERE DTRECV >= TO_DATE(:dateFrom, 'YYYY-MM-DD')
                    AND DTRECV < TO_DATE(:dateTo, 'YYYY-MM-DD') + 1
                    AND LABNO NOT LIKE '_______8%'
                ),
                filtered_rpa AS (
                    SELECT *
                    FROM PHMSDS.REF_PROVIDER_ADDRESS
                    WHERE ADRS_TYPE = '1'
                    AND TRIM(COUNTY) = :county
                ),
                unsat_results AS (
                    SELECT DISTINCT LABNO, MNEMONIC
                    FROM PHMSDS.RESULT_ARCHIVE
                    WHERE MNEMONIC IN ('E100', 'E102', 'E108', 'E109', 'DE')
                ),
                full_results AS (
                    SELECT ra.LABNO, ra.MNEMONIC
                    FROM PHMSDS.RESULT_ARCHIVE ra
                ),
                joined_data AS (
                    SELECT
                        sda.SUBMID,
                        rpa.DESCR1 AS FACILITY_NAME,
                        sda.LABNO,
                        sda.BIRTHHOSP,
                        sda.SPECTYPE,
                        sda.AGECOLL,
                        sda.DTCOLL,
                        sda.DTRECV,
                        ur.MNEMONIC AS UNSAT_MNEMONIC,
                        fr.MNEMONIC AS ALL_MNEMONIC
                    FROM filtered_sda sda
                    JOIN filtered_rpa rpa ON rpa.PROVIDERID = sda.SUBMID
                    LEFT JOIN unsat_results ur ON sda.LABNO = ur.LABNO
                    LEFT JOIN full_results fr ON sda.LABNO = fr.LABNO
                )
                SELECT
                    SUBMID,
                    FACILITY_NAME,
                    COUNT(DISTINCT LABNO) AS TOTAL_SAMPLE_COUNT,
                    COUNT(DISTINCT CASE WHEN BIRTHHOSP = SUBMID THEN LABNO END) AS TOTAL_INBORN,
                    COUNT(DISTINCT CASE WHEN BIRTHHOSP = 'HOME' THEN LABNO END) AS TOTAL_HOMEBIRTH,
                    COUNT(DISTINCT CASE WHEN BIRTHHOSP NOT IN ('HOME', 'UNK') AND BIRTHHOSP <> SUBMID THEN LABNO END) AS TOTAL_HOB,
                    COUNT(DISTINCT CASE WHEN BIRTHHOSP = 'UNK' THEN LABNO END) AS TOTAL_UNKNOWN,

                    COUNT(DISTINCT CASE WHEN BIRTHHOSP IN ('HOME', 'UNK') OR (BIRTHHOSP NOT IN ('HOME', 'UNK') AND BIRTHHOSP <> SUBMID) THEN LABNO END) AS OUTBORN_TOTAL,

                    COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E100' THEN LABNO END) AS MISSING_INFORMATION,
                    COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E102' THEN LABNO END) AS LESS_THAN_24_HOURS,
                    COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E108' THEN LABNO END) AS INSUFFICIENT,
                    COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'E109' THEN LABNO END) AS CONTAMINATED,
                    COUNT(DISTINCT CASE WHEN ALL_MNEMONIC = 'DE' THEN LABNO END) AS DATA_ERASURES,

                    COUNT(DISTINCT CASE WHEN UNSAT_MNEMONIC IS NOT NULL THEN LABNO END) AS TOTAL_UNSAT_COUNT,

                    ROUND(
                        COUNT(DISTINCT CASE WHEN UNSAT_MNEMONIC IS NOT NULL THEN LABNO END) * 100.0
                        / NULLIF(COUNT(DISTINCT LABNO), 0),
                        2
                    ) AS TOTAL_UNSAT_RATE,

                    ROUND(AVG(CASE WHEN SPECTYPE IN (20, 87) THEN AGECOLL / 24 END), 2) AS AVE_AOC,
                    ROUND(AVG(DTRECV - DTCOLL), 2) AS TRANSIT_TIME,
                    ROUND(AVG(CASE WHEN BIRTHHOSP = SUBMID AND SPECTYPE IN (20, 87) THEN AGECOLL / 24 END), 2) AS INBORN_AVERAGE,
                    ROUND(AVG(CASE WHEN BIRTHHOSP <> SUBMID AND SPECTYPE IN (20, 87) THEN AGECOLL / 24 END), 2) AS OUTBORN_AVERAGE

                FROM joined_data
                GROUP BY SUBMID, FACILITY_NAME
                ORDER BY SUBMID, FACILITY_NAME
                `

        const binds = { county, dateFrom, dateTo };
        console.log("[BIND VARIABLES]", binds);

        const result = await oracleDb.execute(query, binds); // OUT_FORMAT not working, fallback to map

        const columns = [
            "PROVIDER_ID",
            "FACILITY_NAME",
            "TOTAL_SAMPLE_COUNT",
            "TOTAL_INBORN",
            "TOTAL_HOMEBIRTH",
            "TOTAL_HOB",
            "TOTAL_UNKNOWN",
            "OUTBORN_TOTAL",
            "MISSING_INFORMATION",
            "LESS_THAN_24_HOURS",
            "INSUFFICIENT",
            "CONTAMINATED",
            "DATA_ERASURES",
            "TOTAL_UNSAT_COUNT",
            "TOTAL_UNSAT_RATE",
            "AVE_AOC",
            "TRANSIT_TIME",
            "INBORN_AVERAGE",
            "OUTBORN_AVERAGE"
        ];

        const rows = result.rows.map(row => {
            const mapped = {};
            columns.forEach((col, index) => {
                mapped[col] = row[index];
            });
            return mapped;
        });

        if (rows.length === 0) {
            console.warn("[NO RESULTS FOUND]", binds);
            return res.status(200).json({
                message: "Query successful but returned no rows",
                params: binds
            });
        }

        console.log(`[QUERY RESULT] Returned ${rows.length} rows`);
        res.status(200).json(rows);

    } catch (err) {
        console.error("[ERROR]", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
});

module.exports = router;
