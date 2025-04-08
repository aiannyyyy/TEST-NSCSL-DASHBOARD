const express = require('express');
const oracledb = require('oracledb');
const getOracleConnection = require("../config/oracleConnection");
const router = express.Router();

router.get('/', async (req, res) => {
    const { year1, year2, month, province } = req.query;

    if (!year1 || !year2 || !month || !province) {
        return res.status(400).json({ error: 'Missing required query parameters: year1, year2, month, province' });
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
            SELECT 
                rpa.COUNTY,
                TO_CHAR(sda.DTRECV, 'YYYY-MM') AS month_year,
                ROUND(AVG(sda.DTRECV - sda.DTCOLL), 2) AS TRANSIT_AVE,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (sda.DTRECV - sda.DTCOLL)), 2) AS TRANSIT_MED,
                ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY (sda.DTRECV - sda.DTCOLL)), 2) AS TRANSIT_MOD,
                ROUND(AVG(sda.DTRECV - sda.BIRTHDT), 2) AS AOS_AVE,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (sda.DTRECV - sda.BIRTHDT)), 2) AS AOS_MED,
                ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY (sda.DTRECV - sda.BIRTHDT)), 2) AS AOS_MOD,
                ROUND(AVG(sda.DTCOLL - sda.BIRTHDT), 2) AS AOC_AVE,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (sda.DTCOLL - sda.BIRTHDT)), 2) AS AOC_MED,
                ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY (sda.DTCOLL - sda.BIRTHDT)), 2) AS AOC_MOD
            FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
            JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa 
                ON sda.SUBMID = rpa.PROVIDERID
            WHERE 
                rpa.ADRS_TYPE = '1'
                AND sda.SPECTYPE IN ('1', '18', '20')
                AND (
                    (sda.DTRECV BETWEEN TO_DATE(:date_from_year1, 'YYYY-MM-DD') AND LAST_DAY(TO_DATE(:date_from_year1, 'YYYY-MM-DD')))
                    OR 
                    (sda.DTRECV BETWEEN TO_DATE(:date_from_year2, 'YYYY-MM-DD') AND LAST_DAY(TO_DATE(:date_from_year2, 'YYYY-MM-DD')))
                )
                AND UPPER(rpa.COUNTY) LIKE UPPER(:province || '%')
                AND sda.BIRTHDT IS NOT NULL
            GROUP BY 
                rpa.COUNTY, TO_CHAR(sda.DTRECV, 'YYYY-MM')
            ORDER BY 
                rpa.COUNTY, month_year
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
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

module.exports = router;
