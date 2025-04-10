const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/", async (req, res) => {
    console.log("API Request Received: /api/common-error");

    let connection;
    try {
        connection = await getOracleConnection();

        const query = `
            SELECT
                AUDIT_SAMPLE."TABLECOLUMN",
                COUNT(SAMPLE_DEMOG_MASTER."LABNO") AS "TOTAL_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'MRGOMEZ' THEN SAMPLE_DEMOG_MASTER."LABNO" END) AS "MRGOMEZ_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'JMAPELADO' THEN SAMPLE_DEMOG_MASTER."LABNO" END) AS "JMAPELADO_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'ABBRUTAS' THEN SAMPLE_DEMOG_MASTER."LABNO" END) AS "ABBRUTAS_COUNT",
                COUNT(CASE WHEN USERS."USERNAME" = 'AAMORFE' THEN SAMPLE_DEMOG_MASTER."LABNO" END) AS "AAMORFE_COUNT",
                ROUND(
                    (COUNT(SAMPLE_DEMOG_MASTER."LABNO") * 100.0) / SUM(COUNT(*)) OVER (),
                    2
                ) AS "PERCENTAGE"
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SAMPLE_DEMOG_MASTER
            JOIN
                "PHMSDS"."USERS" USERS ON SAMPLE_DEMOG_MASTER."INIT_TECH" = USERS."USER_ID"
            JOIN
                "PHMSDS"."AUDIT_SAMPLE" AUDIT_SAMPLE ON SAMPLE_DEMOG_MASTER."LABNO" = AUDIT_SAMPLE."LABNO"
            WHERE
                AUDIT_SAMPLE."TABLECOLUMN" NOT IN ('AGECOLL', 'CMSFLAG', 'FLAG', 'LINK', 'MATCHFLAG', 'MLNAME', 'RFLAG', 'SPECTYPE', 'TWIN')
                AND AUDIT_SAMPLE."OLDDATA" <> 'N'
                AND USERS."USERNAME" IN ('MRGOMEZ', 'JMAPELADO', 'ABBRUTAS', 'AAMORFE')
                AND SAMPLE_DEMOG_MASTER."LABNO" BETWEEN '20250010001' AND '20250319999'
            GROUP BY
                AUDIT_SAMPLE."TABLECOLUMN"
            
            UNION ALL
            
            SELECT
                'ZZZ_TOTAL' AS TABLECOLUMN,
                COUNT(SAMPLE_DEMOG_MASTER."LABNO"),
                COUNT(CASE WHEN USERS."USERNAME" = 'MRGOMEZ' THEN SAMPLE_DEMOG_MASTER."LABNO" END),
                COUNT(CASE WHEN USERS."USERNAME" = 'JMAPELADO' THEN SAMPLE_DEMOG_MASTER."LABNO" END),
                COUNT(CASE WHEN USERS."USERNAME" = 'ABBRUTAS' THEN SAMPLE_DEMOG_MASTER."LABNO" END),
                COUNT(CASE WHEN USERS."USERNAME" = 'AAMORFE' THEN SAMPLE_DEMOG_MASTER."LABNO" END),
                100.00
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SAMPLE_DEMOG_MASTER
            JOIN
                "PHMSDS"."USERS" USERS ON SAMPLE_DEMOG_MASTER."INIT_TECH" = USERS."USER_ID"
            JOIN
                "PHMSDS"."AUDIT_SAMPLE" AUDIT_SAMPLE ON SAMPLE_DEMOG_MASTER."LABNO" = AUDIT_SAMPLE."LABNO"
            WHERE
                AUDIT_SAMPLE."TABLECOLUMN" NOT IN ('AGECOLL', 'CMSFLAG', 'FLAG', 'LINK', 'MATCHFLAG', 'MLNAME', 'RFLAG', 'SPECTYPE', 'TWIN')
                AND AUDIT_SAMPLE."OLDDATA" <> 'N'
                AND USERS."USERNAME" IN ('MRGOMEZ', 'JMAPELADO', 'ABBRUTAS', 'AAMORFE')
                AND SAMPLE_DEMOG_MASTER."LABNO" BETWEEN '20250010001' AND '20250319999'
                
            ORDER BY 1
        `;

        console.log("Executing Query:", query);

        const result = await connection.execute(query, [], {
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
