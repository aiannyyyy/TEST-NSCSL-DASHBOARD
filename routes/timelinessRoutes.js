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
                AND EXTRACT(MONTH FROM sda.DTRECV) = 2  -- February (month 2)
                AND EXTRACT(YEAR FROM sda.DTRECV) IN (2024, 2025)  -- Compare years 2024 and 2025
                AND rpa.COUNTY IN ('CAVITE', 'LAGUNA', 'BATANGAS', 'RIZAL', 'QUEZON')
                AND sda.BIRTHDT IS NOT NULL
            GROUP BY 
                rpa.COUNTY, EXTRACT(YEAR FROM sda.DTRECV)
            ORDER BY 
                rpa.COUNTY, EXTRACT(YEAR FROM sda.DTRECV)
        `;

        const result = await connection.execute(query, [], {
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