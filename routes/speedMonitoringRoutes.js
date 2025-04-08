const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/", async (req, res) => {
    let connection;

    try {
        const { year, month, type } = req.query;

        if (!year || !month || !type) {
            return res.status(400).json({ error: "Missing required query parameters: year, month, and type" });
        }

        // Convert month string to numeric value
        const monthNum = parseInt(month, 10);
        
        // Create start date: first day of month at 00:00:00
        const startDate = `${year}-${month.padStart(2, '0')}-01 00:00:00`;
        
        // Calculate the last day of the month
        // Create a date for the first day of the next month, then subtract 1 day
        const lastDay = new Date(year, monthNum, 0).getDate(); // Get the last day of the month
        
        // Create end date: last day of month at 23:59:59
        const formattedEndDate = `${year}-${month.padStart(2, '0')}-${lastDay} 23:59:59`;

        const columnMap = {
            entry: {
                techColumn: `"INIT_TECH"`,
                startColumn: `"INIT_START"`,
                endColumn: `"INIT_END"`
            },
            verification: {
                techColumn: `"VER_TECH"`,
                startColumn: `"VER_START"`,
                endColumn: `"VER_END"`
            }
        };

        const cols = columnMap[type.toLowerCase()];
        if (!cols) {
            return res.status(400).json({ error: "Invalid type. Use 'entry' or 'verification'." });
        }

        const query = `
            SELECT 
                u."FIRSTNAME",
                TO_CHAR(sa."DTRECV", 'YYYY-MM') AS month,
                ROUND(AVG((sa.${cols.endColumn} - sa.${cols.startColumn}) * 86400)) AS monthly_avg_init_time_seconds,
                COUNT(sa."LABNO") AS total_samples
            FROM 
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sa
            JOIN 
                "PHSECURE"."USERS" u ON sa.${cols.techColumn} = u."USER_ID"
            WHERE 
                sa."DTRECV" >= TO_TIMESTAMP(:startDate, 'YYYY-MM-DD HH24:MI:SS') AND
                sa."DTRECV" <= TO_TIMESTAMP(:endDate, 'YYYY-MM-DD HH24:MI:SS') AND
                u."FIRSTNAME" IN ('ABIGAIL', 'ANGELICA', 'JAY ARR', 'Mary Rose')
            GROUP BY 
                u."FIRSTNAME", TO_CHAR(sa."DTRECV", 'YYYY-MM')
            ORDER BY 
                u."FIRSTNAME", month
        `;

        connection = await getOracleConnection();

        const result = await connection.execute(
            query,
            { startDate, endDate: formattedEndDate },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({ data: result.rows });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("❌ Error closing connection:", err);
            }
        }
    }
});
module.exports = router;
