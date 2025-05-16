const express = require('express');
const oracledb = require('oracledb');
const getOracleConnection = require('../config/oracleConnection');
const NodeCache = require('node-cache');

const router = express.Router();
const cache = new NodeCache({ stdTTL: 600 }); // cache for 10 minutes

router.get('/', async (req, res) => {
    const { year1, year2 } = req.query;

    if (!year1 || !year2) {
        return res.status(400).json({ error: 'Missing required query parameters: year1 and year2' });
    }

    const cacheKey = `unsat-${year1}-${year2}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    const query = `
        SELECT
            TO_CHAR(sda.DTRECV, 'YYYY-MM') AS month,
            ROUND(
                COUNT(DISTINCT CASE 
                    WHEN ra.MNEMONIC IN ('DE', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108') 
                        AND sda.SPECTYPE IN (20, 87, 1, 18)
                    THEN sda.LABNO 
                END) / NULLIF(COUNT(DISTINCT CASE 
                    WHEN sda.SPECTYPE IN (20, 87, 1, 18)
                    THEN sda.LABNO 
                END), 0) * 100.0,
                2
            ) AS percent_unsat
        FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
        LEFT JOIN PHMSDS.RESULT_ARCHIVE ra 
            ON sda.LABNO = ra.LABNO
        WHERE sda.SPECTYPE IN (20, 87)
          AND EXTRACT(YEAR FROM sda.DTRECV) IN (:year1, :year2)
        GROUP BY TO_CHAR(sda.DTRECV, 'YYYY-MM')
        ORDER BY month
    `;

    const binds = {
        year1: parseInt(year1),
        year2: parseInt(year2),
    };

    try {
        const connection = await getOracleConnection();
        const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        const formattedData = result.rows.map(row => ({
            month: row.MONTH,
            percent_unsat: row.PERCENT_UNSAT
        }));

        cache.set(cacheKey, formattedData); // Save to cache
        return res.json(formattedData);
    } catch (err) {
        console.error('Error executing Oracle query:', err);
        return res.status(500).json({ error: 'Database error occurred' });
    }
});

module.exports = router;
