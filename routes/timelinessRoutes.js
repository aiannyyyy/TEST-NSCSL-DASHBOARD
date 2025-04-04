const express = require('express');
const oracledb = require('oracledb');
const getOracleConnection = require("../config/oracleConnection");
const router = express.Router();

router.get('/', async (req, res) => {
    let connection = await getOracleConnection();

    if (!connection) {
        return res.status(500).json({ error: 'Oracle connection not available' });
    }

    try {
        const { year1, year2, province, month } = req.query;

        // Convert month name to number (Jan -> 01, Feb -> 02, etc.)
        const monthMap = {
            Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
            Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
        };
        const numericMonth = monthMap[month];

        if (!numericMonth) {
            return res.status(400).json({ error: "Invalid month provided" });
        }

        const startDate = `${year1}-${numericMonth}-01`;
        const endDate = `${year2}-${numericMonth}-31`;

        const query = `
            SELECT 
                rpa.COUNTY,
                EXTRACT(YEAR FROM sda.DTRECV) AS YEAR,
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
                AND sda.DTRECV BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
                AND rpa.COUNTY = :province
                AND sda.BIRTHDT IS NOT NULL
                AND EXTRACT(YEAR FROM sda.DTRECV) >= 2013
            GROUP BY 
                rpa.COUNTY, EXTRACT(YEAR FROM sda.DTRECV)
            ORDER BY 
                rpa.COUNTY, YEAR
        `;

        const result = await connection.execute(query, {
            startDate,
            endDate,
            province
        }, {
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
