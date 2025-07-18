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

        // Extract and normalize query params
        const county = req.query.county?.toUpperCase();
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;

        if (!county || !dateFrom || !dateTo) {
            console.warn("[MISSING PARAMS]", { county, dateFrom, dateTo });
            return res.status(400).json({
                error: "Missing one or more required query parameters: county, dateFrom, dateTo"
            });
        }

        // Debug log for input values
        console.log("[REQUEST PARAMS]", { county, dateFrom, dateTo });

        // =============================================================
        // DEBUG SECTION - Remove after troubleshooting
        // =============================================================
        try {
            // 1. Test basic connectivity and schema
            const connectTest = await oracleDb.execute("SELECT USER, SYSDATE FROM DUAL");
            console.log("[DB CONNECTION TEST]", connectTest.rows[0]);

            // 2. Check if BATANGAS exists in the provider table
            const countyTest = await oracleDb.execute(
                "SELECT COUNT(*) as COUNTY_COUNT FROM PHMSDS.REF_PROVIDER_ADDRESS WHERE TRIM(COUNTY) = :county",
                { county }
            );
            console.log("[COUNTY TEST]", countyTest.rows[0]);

            // 3. Check if there are any records in the date range (without county filter)
            const dateTest = await oracleDb.execute(`
                SELECT COUNT(*) as DATE_COUNT 
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE 
                WHERE DTRECV BETWEEN TO_DATE(:dateFrom, 'YYYY-MM-DD') 
                AND TO_DATE(:dateTo || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
            `, { dateFrom, dateTo });
            console.log("[DATE RANGE TEST]", dateTest.rows[0]);

            // 4. Check if there are any records for BATANGAS (without date filter)
            const batangasTest = await oracleDb.execute(`
                SELECT COUNT(*) as BATANGAS_COUNT
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
                JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa ON rpa.PROVIDERID = sda.SUBMID AND rpa.ADRS_TYPE = '1'
                WHERE TRIM(rpa.COUNTY) = :county
            `, { county });
            console.log("[BATANGAS RECORDS TEST]", batangasTest.rows[0]);

            // 4b. Check each table separately for BATANGAS
            const rpaTest = await oracleDb.execute(`
                SELECT COUNT(*) as RPA_COUNT, MIN(PROVIDERID) as SAMPLE_PROVIDER
                FROM PHMSDS.REF_PROVIDER_ADDRESS 
                WHERE TRIM(COUNTY) = :county AND ADRS_TYPE = '1'
            `, { county });
            console.log("[REF_PROVIDER_ADDRESS TEST]", rpaTest.rows[0]);

            // 4c. Check if those providers have any samples
            if (rpaTest.rows[0].SAMPLE_PROVIDER) {
                const samplesTest = await oracleDb.execute(`
                    SELECT COUNT(*) as SAMPLES_COUNT
                    FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE 
                    WHERE SUBMID = :providerId
                `, { providerId: rpaTest.rows[0].SAMPLE_PROVIDER });
                console.log("[SAMPLES FOR PROVIDER TEST]", samplesTest.rows[0]);
            }

            // 4d. Check if there are records in the full date range for BATANGAS
            const fullTest = await oracleDb.execute(`
                SELECT COUNT(*) as FULL_COUNT
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
                JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa ON rpa.PROVIDERID = sda.SUBMID AND rpa.ADRS_TYPE = '1'
                JOIN PHMSDS.RESULT_ARCHIVE ra ON sda.LABNO = ra.LABNO
                JOIN PHMSDS.LIB_DISORDER_RESULT ldr ON ra.MNEMONIC = ldr.MNEMONIC
                WHERE TRIM(rpa.COUNTY) = :county
                AND sda.DTRECV BETWEEN TO_DATE(:dateFrom, 'YYYY-MM-DD') 
                AND TO_DATE(:dateTo || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                AND sda.LABNO NOT LIKE '_______8%'
            `, { county, dateFrom, dateTo });
            console.log("[FULL QUERY TEST]", fullTest.rows[0]);

            // 5. List all available counties to verify the exact name
            const allCounties = await oracleDb.execute(`
                SELECT DISTINCT TRIM(COUNTY) as COUNTY
                FROM PHMSDS.REF_PROVIDER_ADDRESS 
                WHERE COUNTY IS NOT NULL 
                ORDER BY TRIM(COUNTY)
            `);
            console.log("[ALL COUNTIES]", allCounties.rows.map(r => r.COUNTY));

            // 6. Check for any BATANGAS variants
            const batangasVariants = await oracleDb.execute(`
                SELECT DISTINCT COUNTY 
                FROM PHMSDS.REF_PROVIDER_ADDRESS 
                WHERE UPPER(COUNTY) LIKE '%BATAN%'
            `);
            console.log("[BATANGAS VARIANTS]", batangasVariants.rows);

            // 7. Test if there are any samples in 2024 for BATANGAS (since 2025 might not have data)
            const batangas2024Test = await oracleDb.execute(`
                SELECT COUNT(*) as BATANGAS_2024_COUNT
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
                JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa ON rpa.PROVIDERID = sda.SUBMID AND rpa.ADRS_TYPE = '1'
                WHERE TRIM(rpa.COUNTY) = :county
                AND sda.DTRECV BETWEEN TO_DATE('2024-01-01', 'YYYY-MM-DD') 
                AND TO_DATE('2024-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
            `, { county });
            console.log("[BATANGAS 2024 TEST]", batangas2024Test.rows[0]);

        } catch (debugError) {
            console.error("[DEBUG ERROR]", debugError);
        }
        // =============================================================
        // END DEBUG SECTION
        // =============================================================

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

        const binds = { county, dateFrom, dateTo };
        console.log("[BIND VARIABLES]", binds);

        const result = await oracleDb.execute(query, binds, { outFormat: oracleDb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) {
            console.warn("[NO RESULTS FOUND]", binds);
            return res.status(200).json({
                message: "Query successful but returned no rows",
                params: binds
            });
        }

        console.log(`[QUERY RESULT] Returned ${result.rows.length} rows`);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("[ERROR]", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
});

module.exports = router;