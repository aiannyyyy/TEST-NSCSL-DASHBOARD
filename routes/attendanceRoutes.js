const express = require('express');
const router = express.Router();
const ADODB = require('node-adodb');

// Use the Jet OLEDB provider instead of ACE OLEDB
const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=D:\\Att2003.mdb;Persist Security Info=False;');

router.get('/', async (req, res) => {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        const query = `
            SELECT
                u.Userid,
                u.Name AS Name,
                MIN(c.CheckTime) AS FirstCheckIn
            FROM
                Checkinout c
            INNER JOIN
                Userinfo u ON u.Userid = c.Userid
            WHERE
                FORMAT(c.CheckTime, 'yyyy-mm-dd') = '${formattedDate}'
            GROUP BY
                u.Userid, u.Name
            HAVING
                FORMAT(MIN(c.CheckTime), 'hh:nn') >= '08:06'
            ORDER BY
                FirstCheckIn ASC
        `;

        const data = await connection.query(query);

        const result = data.map(entry => {
            const checkIn = new Date(entry.FirstCheckIn);
            const lateStart = new Date(`${formattedDate}T08:00:00`);
            const diffMs = checkIn - lateStart;
            const diffMins = Math.floor(diffMs / 60000);

            return {
                Userid: entry.Userid,
                Name: entry.Name,
                FirstCheckIn: checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                MinutesLate: diffMins
            };
        });

        res.json(result);
    } catch (error) {
        console.error("❌ Access DB Error:", error.message);
        res.status(500).json({ error: "Failed to get late attendance data" });
    }
});

module.exports = router;
