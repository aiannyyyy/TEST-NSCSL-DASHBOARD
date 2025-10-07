/*
const express = require('express');
const oracledb = require('oracledb');
const getOracleConnection = require("../config/oracleConnection");
const router = express.Router();

// Helper function to validate month_year
const isValidMonthYear = (monthYear) => {
    // Basic regex check for valid 'YYYY-MM' format
    const regex = /^\d{4}-\d{2}$/;
    return regex.test(monthYear);
};

router.get('/', async (req, res) => {
    const { year1, year2, month, province } = req.query;

    // Validate required query parameters
    if (!year1 || !year2 || !month || !province) {
        return res.status(400).json({ error: 'Missing required query parameters: year1, year2, month, province' });
    }

    // Validate that month is between 1 and 12
    if (parseInt(month) < 1 || parseInt(month) > 12) {
        return res.status(400).json({ error: 'Invalid month value, must be between 1 and 12' });
    }

    // Construct the start and end dates for the specific month in both years
    const monthPadded = month.toString().padStart(2, '0');
    const date_from_year1 = `${year1}-${monthPadded}-01`;
    const date_to_year1 = `${year1}-${monthPadded}-01`; // Temporary end date, we will calculate last day later

    const date_from_year2 = `${year2}-${monthPadded}-01`;
    const date_to_year2 = `${year2}-${monthPadded}-01`; // Temporary end date, we will calculate last day later

    let connection = await getOracleConnection();
    if (!connection) {
        return res.status(500).json({ error: 'Oracle connection not available' });
    }

    try {
       const query = `
       WITH base AS (
            SELECT
                TO_CHAR(sda.DTRECV, 'YYYY') AS year_label,
                (sda.DTRECV - sda.DTCOLL) AS transit_days,
                (sda.DTRECV - sda.BIRTHDT) AS aos_days,
                (sda.DTCOLL - sda.BIRTHDT) AS aoc_days
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
            JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa 
                ON sda.SUBMID = rpa.PROVIDERID
            WHERE 
                rpa.ADRS_TYPE = '1'
                AND sda.SPECTYPE IN ('1','18','20')
                AND (
                    (sda.DTRECV BETWEEN TO_DATE(:date_from_year1,'YYYY-MM-DD HH24:MI:SS')
                                AND TO_DATE(:date_from_year1,'YYYY-MM-DD HH24:MI:SS'))
                    OR
                    (sda.DTRECV BETWEEN TO_DATE(:date_from_year2,'YYYY-MM-DD HH24:MI:SS')
                                AND TO_DATE(:date_from_year2,'YYYY-MM-DD HH24:MI:SS'))
                )
                AND UPPER(rpa.COUNTY) LIKE UPPER(:province || '%')
                AND sda.BIRTHDT IS NOT NULL
        ),
        iqr_calc AS (
            SELECT
                year_label,

                -- Transit
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY transit_days) AS TT_Q1,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY transit_days) AS TT_Q3,

                -- AOS
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY aos_days) AS AOS_Q1,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY aos_days) AS AOS_Q3,

                -- AOC
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY aoc_days) AS AOC_Q1,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY aoc_days) AS AOC_Q3
            FROM base
            GROUP BY year_label
        ),
        limits AS (
            SELECT
                year_label,
                TT_Q1, TT_Q3,
                (TT_Q3 - TT_Q1) AS TT_IQR,
                (TT_Q1 - 1.5*(TT_Q3 - TT_Q1)) AS TT_Lower,
                (TT_Q3 + 1.5*(TT_Q3 - TT_Q1)) AS TT_Upper,

                AOS_Q1, AOS_Q3,
                (AOS_Q3 - AOS_Q1) AS AOS_IQR,
                (AOS_Q1 - 1.5*(AOS_Q3 - AOS_Q1)) AS AOS_Lower,
                (AOS_Q3 + 1.5*(AOS_Q3 - AOS_Q1)) AS AOS_Upper,

                AOC_Q1, AOC_Q3,
                (AOC_Q3 - AOC_Q1) AS AOC_IQR,
                (AOC_Q1 - 1.5*(AOC_Q3 - AOC_Q1)) AS AOC_Lower,
                (AOC_Q3 + 1.5*(AOC_Q3 - AOC_Q1)) AS AOC_Upper
            FROM iqr_calc
        ),
        filtered AS (
            SELECT
                b.year_label,
                b.transit_days,
                b.aos_days,
                b.aoc_days
            FROM base b
            JOIN limits l
            ON b.year_label = l.year_label
            WHERE 
                b.transit_days BETWEEN l.TT_Lower AND l.TT_Upper
                AND b.aos_days BETWEEN l.AOS_Lower AND l.AOS_Upper
                AND b.aoc_days BETWEEN l.AOC_Lower AND l.AOC_Upper
        )
        SELECT
            year_label,

            -- Transit (cleaned)
            ROUND(AVG(transit_days),2) AS TT_Mean,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY transit_days),2) AS TT_Median,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY transit_days),2) AS TT_Mode,

            -- AOS (cleaned)
            ROUND(AVG(aos_days),2) AS AOS_Mean,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aos_days),2) AS AOS_Median,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY aos_days),2) AS AOS_Mode,

            -- AOC (cleaned)
            ROUND(AVG(aoc_days),2) AS AOC_Mean,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aoc_days),2) AS AOC_Median,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY aoc_days),2) AS AOC_Mode

        FROM filtered
        GROUP BY year_label
        ORDER BY year_label
    `;

        const binds = {
            date_from_year1,
            date_from_year2,
            province: province.trim()
        };

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        if (result.rows.length === 0) {
            return res.json({ message: "No data found" });
        }

        // Post-query processing to validate and correct month_year
        const correctedRows = result.rows.map(row => {
            let monthYear = row.MONTH_YEAR;

            if (!isValidMonthYear(monthYear)) {
                console.warn(`Invalid month_year: ${monthYear}, setting to default (2024-01)`);
                monthYear = "2024-01"; // Set a default or handle accordingly
            }

            return {
                ...row,
                MONTH_YEAR: monthYear
            };
        });

        res.json(correctedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

module.exports = router;
*/
const express = require('express');
const oracledb = require('oracledb');
const getOracleConnection = require("../config/oracleConnection");
const router = express.Router();

router.get('/', async (req, res) => {
    const { year1, year2, month, province } = req.query;

    // Validate required query parameters
    if (!year1 || !year2 || !month || !province) {
        return res.status(400).json({ error: 'Missing required query parameters: year1, year2, month, province' });
    }

    // Validate that month is between 1 and 12
    const monthInt = parseInt(month);
    if (monthInt < 1 || monthInt > 12) {
        return res.status(400).json({ error: 'Invalid month value, must be between 1 and 12' });
    }

    // Construct the start dates for the specific month in both years
    const monthPadded = month.toString().padStart(2, '0');
    const date_from_year1 = `${year1}-${monthPadded}-01`;
    const date_from_year2 = `${year2}-${monthPadded}-01`;

    let connection = await getOracleConnection();
    if (!connection) {
        return res.status(500).json({ error: 'Oracle connection not available' });
    }

    try {
        const query = `
        WITH base AS (
            SELECT
                rpa.COUNTY,
                TO_CHAR(sda.DTRECV, 'YYYY-MM') AS month_year,
                (sda.DTRECV - sda.DTCOLL) AS transit_days,
                (sda.DTRECV - sda.BIRTHDT) AS aos_days,
                (sda.DTCOLL - sda.BIRTHDT) AS aoc_days
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
            JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa 
                ON sda.SUBMID = rpa.PROVIDERID
            WHERE 
                rpa.ADRS_TYPE = '1'
                AND sda.SPECTYPE IN ('1','18','20')
                AND (
                    (sda.DTRECV BETWEEN TO_DATE(:date_from_year1, 'YYYY-MM-DD') AND LAST_DAY(TO_DATE(:date_from_year1, 'YYYY-MM-DD')))
                    OR 
                    (sda.DTRECV BETWEEN TO_DATE(:date_from_year2, 'YYYY-MM-DD') AND LAST_DAY(TO_DATE(:date_from_year2, 'YYYY-MM-DD')))
                )
                AND UPPER(rpa.COUNTY) LIKE UPPER(:province || '%')
                AND sda.BIRTHDT IS NOT NULL
        ),
        iqr_calc AS (
            SELECT
                COUNTY,
                month_year,

                -- Transit
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY transit_days) AS TT_Q1,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY transit_days) AS TT_Q3,

                -- AOS
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY aos_days) AS AOS_Q1,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY aos_days) AS AOS_Q3,

                -- AOC
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY aoc_days) AS AOC_Q1,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY aoc_days) AS AOC_Q3
            FROM base
            GROUP BY COUNTY, month_year
        ),
        limits AS (
            SELECT
                COUNTY,
                month_year,
                TT_Q1, TT_Q3,
                (TT_Q3 - TT_Q1) AS TT_IQR,
                (TT_Q1 - 1.5*(TT_Q3 - TT_Q1)) AS TT_Lower,
                (TT_Q3 + 1.5*(TT_Q3 - TT_Q1)) AS TT_Upper,

                AOS_Q1, AOS_Q3,
                (AOS_Q3 - AOS_Q1) AS AOS_IQR,
                (AOS_Q1 - 1.5*(AOS_Q3 - AOS_Q1)) AS AOS_Lower,
                (AOS_Q3 + 1.5*(AOS_Q3 - AOS_Q1)) AS AOS_Upper,

                AOC_Q1, AOC_Q3,
                (AOC_Q3 - AOC_Q1) AS AOC_IQR,
                (AOC_Q1 - 1.5*(AOC_Q3 - AOC_Q1)) AS AOC_Lower,
                (AOC_Q3 + 1.5*(AOC_Q3 - AOC_Q1)) AS AOC_Upper
            FROM iqr_calc
        ),
        filtered AS (
            SELECT
                b.COUNTY,
                b.month_year,
                b.transit_days,
                b.aos_days,
                b.aoc_days
            FROM base b
            JOIN limits l
            ON b.COUNTY = l.COUNTY AND b.month_year = l.month_year
            WHERE 
                b.transit_days BETWEEN l.TT_Lower AND l.TT_Upper
                AND b.aos_days BETWEEN l.AOS_Lower AND l.AOS_Upper
                AND b.aoc_days BETWEEN l.AOC_Lower AND l.AOC_Upper
        )
        SELECT
            COUNTY,
            month_year AS MONTH_YEAR,

            -- Transit (cleaned)
            ROUND(AVG(transit_days),2) AS TRANSIT_AVE,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY transit_days),2) AS TRANSIT_MED,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY transit_days),2) AS TRANSIT_MOD,

            -- AOS (cleaned)
            ROUND(AVG(aos_days),2) AS AOS_AVE,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aos_days),2) AS AOS_MED,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY aos_days),2) AS AOS_MOD,

            -- AOC (cleaned)
            ROUND(AVG(aoc_days),2) AS AOC_AVE,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aoc_days),2) AS AOC_MED,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY aoc_days),2) AS AOC_MOD

        FROM filtered
        GROUP BY COUNTY, month_year
        ORDER BY COUNTY, month_year
        `;

        const binds = {
            date_from_year1,
            date_from_year2,
            province: province.trim()
        };

        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        if (result.rows.length === 0) {
            return res.json({ message: "No data found" });
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

module.exports = router;
