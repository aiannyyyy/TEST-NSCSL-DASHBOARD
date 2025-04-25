const express = require('express');
const router = express.Router();
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Path to your MDB file
const dbPath = 'D:\\Att2003.mdb';

// Utilities
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

// Query function using mdbtools
function queryMdb(query, dbFile) {
    try {
        const tempFile = path.join(os.tmpdir(), `query_${Date.now()}.sql`);
        fs.writeFileSync(tempFile, query);

        const result = spawnSync('mdb-sql', ['-F', ',', '-H', '-i', tempFile, dbFile], { encoding: 'utf-8' });
        fs.unlinkSync(tempFile);

        if (result.error) throw new Error(`Spawn error: ${result.error.message}`);
        if (result.status !== 0) throw new Error(`mdb-sql failed: ${result.stderr || 'Unknown error'}`);

        const lines = result.stdout.trim().split('\n');
        if (lines.length <= 1) return [];

        const headers = lines[0].split(',');
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, idx) => {
                obj[header.trim()] = (values[idx] || '').trim();
                return obj;
            }, {});
        });

    } catch (err) {
        console.error('[MDB QUERY ERROR]', err);
        throw err;
    }
}

// Route: GET / (Late check-ins for today)
router.get('/', async (req, res) => {
    try {
        const today = new Date();
        const formattedDate = formatDate(today);

        const sql = `
            SELECT
                u.Userid,
                u.Name AS Name,
                MIN(c.CheckTime) AS FirstCheckIn
            FROM
                Checkinout c
            INNER JOIN
                Userinfo u ON u.Userid = c.Userid
            WHERE
                Year(c.CheckTime) = ${today.getFullYear()}
                AND Month(c.CheckTime) = ${today.getMonth() + 1}
                AND Day(c.CheckTime) = ${today.getDate()}
            GROUP BY
                u.Userid, u.Name
            HAVING
                Hour(MIN(c.CheckTime)) * 60 + Minute(MIN(c.CheckTime)) >= (8 * 60 + 6)
            ORDER BY
                FirstCheckIn ASC
        `;

        const rawData = queryMdb(sql, dbPath);

        const result = rawData.map(entry => {
            const checkIn = new Date(entry.FirstCheckIn);
            const lateCutoff = new Date(`${formattedDate}T08:00:00`);
            const minsLate = Math.floor((checkIn - lateCutoff) / 60000);

            return {
                Userid: entry.Userid,
                Name: entry.Name,
                FirstCheckIn: formatTime(checkIn),
                MinutesLate: minsLate
            };
        });

        res.json(result);
    } catch (err) {
        console.error("❌ Failed to retrieve late check-ins:", err.message);
        res.status(500).json({
            error: 'Failed to get late attendance data',
            message: err.message
        });
    }
});

module.exports = router;
