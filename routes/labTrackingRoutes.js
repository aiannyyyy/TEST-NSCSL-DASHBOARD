const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/", async (req, res) => {
    let connection;

    // Extract and default year/month
    const year = parseInt(req.query.year) || 2025;
    const month = parseInt(req.query.month) || 1;

    // Build date range for the given month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01 00:00:00.00`;
    const lastDay = new Date(year, month, 0).getDate(); // Gets the last day of the month
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay} 23:59:59.00`;

    try {
        connection = await getOracleConnection();

        const query = `
            SELECT
                ROUND(AVG(sda.DTRECV - sda.DTCOLL), 2) AS AVE,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (sda.DTRECV - sda.DTCOLL)), 2) AS MED,
                ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY (sda.DTRECV - sda.DTCOLL)), 2) AS MOD,
                ROUND(AVG(sda.DTRPTD - sda.DTRECV), 2) AS AVE_RPTD,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (sda.DTRPTD - sda.DTRECV)), 2) AS MED_RPTD,
                ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY (sda.DTRPTD - sda.DTRECV)), 2) AS MOD_RPTD
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sda
            WHERE
                sda."DTRECV" >= TO_TIMESTAMP(:startDate, 'YYYY-MM-DD HH24:MI:SS.FF') AND
                sda."DTRECV" <= TO_TIMESTAMP(:endDate, 'YYYY-MM-DD HH24:MI:SS.FF')
        `;

        const result = await connection.execute(query, { startDate, endDate });

        const [row] = result.rows;

        const labeledResponse = {
            dtcoll_to_dtrecv: {
                average: row[0],
                median: row[1],
                mode: row[2],
            },
            dtrecv_to_dtrptd: {
                average: row[3],
                median: row[4],
                mode: row[5],
            }
        };

        res.status(200).json(labeledResponse);
    } catch (err) {
        console.error("Error fetching statistics:", err);
        res.status(500).json({ error: "Failed to fetch statistics" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing Oracle connection:", err);
            }
        }
    }
});

module.exports = router;
