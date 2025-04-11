const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/", async (req, res) => {
    console.log("API Request Received: /api/common-error");

    let connection;
    try {
        connection = await getOracleConnection();

        // Extract year and month from query parameters
        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ error: "Year and month are required" });
        }

        // Convert month to a two-digit format (e.g., 1 -> 01, 10 -> 10)
        const monthNum = parseInt(month, 10);
        const formattedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;

        // Create start and end date strings
        const startDate = `${year}-${formattedMonth}-01 00:00:00`;

        // Get the last day of the month
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${year}-${formattedMonth}-${lastDay} 23:59:59`;

        const query = `
            SELECT
                AUDIT_SAMPLE."TABLECOLUMN",
                TO_CHAR(SAMPLE_DEMOG_ARCHIVE."DTRECV", 'YYYY-MM') AS month,
                COUNT(SAMPLE_DEMOG_ARCHIVE."LABNO") AS "TOTAL_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'MRGOMEZ' THEN SAMPLE_DEMOG_ARCHIVE."LABNO" END) AS "MRGOMEZ_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'JMAPELADO' THEN SAMPLE_DEMOG_ARCHIVE."LABNO" END) AS "JMAPELADO_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'ABBRUTAS' THEN SAMPLE_DEMOG_ARCHIVE."LABNO" END) AS "ABBRUTAS_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'AAMORFE' THEN SAMPLE_DEMOG_ARCHIVE."LABNO" END) AS "AAMORFE_COUNT",
                ROUND(
                    (COUNT(SAMPLE_DEMOG_ARCHIVE."LABNO") * 100.0) / 
                    SUM(COUNT(SAMPLE_DEMOG_ARCHIVE."LABNO")) OVER (),
                    2
                ) AS "PERCENTAGE"
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE"
            JOIN
                "PHMSDS"."USERS" USERS ON SAMPLE_DEMOG_ARCHIVE."INIT_TECH" = USERS."USER_ID"
            JOIN
                "PHMSDS"."AUDIT_SAMPLE" AUDIT_SAMPLE ON SAMPLE_DEMOG_ARCHIVE."LABNO" = AUDIT_SAMPLE."LABNO"
            WHERE
                AUDIT_SAMPLE."TABLECOLUMN" NOT IN (
                    'AGECOLL', 'CMSFLAG', 'FLAG', 'LINK', 'MATCHFLAG', 'MLNAME', 'RFLAG', 'SPECTYPE', 'TWIN'
                )
                AND AUDIT_SAMPLE."OLDDATA" <> 'N'
                AND USERS."USERNAME" IN ('MRGOMEZ', 'JMAPELADO', 'ABBRUTAS', 'AAMORFE')
                AND SAMPLE_DEMOG_ARCHIVE."DTRECV" BETWEEN 
                    TO_TIMESTAMP(:startDate, 'YYYY-MM-DD HH24:MI:SS') 
                    AND TO_TIMESTAMP(:endDate, 'YYYY-MM-DD HH24:MI:SS')
            GROUP BY
                AUDIT_SAMPLE."TABLECOLUMN", TO_CHAR(SAMPLE_DEMOG_ARCHIVE."DTRECV", 'YYYY-MM')
            ORDER BY
                AUDIT_SAMPLE."TABLECOLUMN" ASC
        `;

        console.log("Executing Query with parameters:", { startDate, endDate });

        const result = await connection.execute(query, { startDate, endDate }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT   
        });

        console.log("Query Results:", result.rows);
        res.json({ data: result.rows });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
});

module.exports = router;
