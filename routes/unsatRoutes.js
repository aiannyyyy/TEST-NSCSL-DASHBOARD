// for selecting by number
//unsatRoutes.js
const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

router.get("/top-unsatisfactory", async (req, res) => {
    try {
        // ✅ Get Oracle connection from app.locals
        const connection = req.app.locals.oracleDb;  
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        // ✅ Get query parameters
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: "Missing 'from' or 'to' date parameters" });
        }

        console.log(`🔍 Filtering data from ${from} to ${to}`);

        const query = `
            SELECT * FROM (
                SELECT 
                    facility_name,
                    province,
                    SUM(unsatisfactory_count) AS unsatisfactory_count
                FROM (
                    SELECT 
                        rpa."DESCR1" AS facility_name, 
                        rpa."COUNTY" AS province, 
                        COUNT(DISTINCT sda."LABNO") AS unsatisfactory_count
                    FROM 
                        "PHMSDS"."REF_PROVIDER_ADDRESS" rpa
                    JOIN 
                        "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sda 
                        ON rpa."PROVIDERID" = sda."SUBMID"
                    JOIN 
                        "PHMSDS"."RESULT_ARCHIVE" ra 
                        ON sda."LABNO" = ra."LABNO"
                    JOIN 
                        "PHMSDS"."LIB_DISORDER_RESULT" ldr 
                        ON ra."MNEMONIC" = ldr."MNEMONIC"
                    WHERE 
                        rpa."ADRS_TYPE" = '1'
                        AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108')
                        AND sda."LABNO" NOT LIKE '_______8%'
                        AND sda."DTRECV" >= TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI:SS')
                        AND sda."DTRECV" <= TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI:SS')
                    GROUP BY 
                        rpa."DESCR1", rpa."COUNTY"

                    UNION ALL

                    SELECT 
                        rpa."DESCR1" AS facility_name, 
                        rpa."COUNTY" AS province, 
                        COUNT(DISTINCT sdm."LABNO") AS unsatisfactory_count
                    FROM 
                        "PHMSDS"."REF_PROVIDER_ADDRESS" rpa
                    JOIN 
                        "PHMSDS"."SAMPLE_DEMOG_MASTER" sdm 
                        ON rpa."PROVIDERID" = sdm."SUBMID"
                    JOIN 
                        "PHMSDS"."RESULT_MASTER" rm 
                        ON sdm."LABNO" = rm."LABNO"
                    JOIN 
                        "PHMSDS"."LIB_DISORDER_RESULT" ldr 
                        ON rm."MNEMONIC" = ldr."MNEMONIC"
                    WHERE 
                        rpa."ADRS_TYPE" = '1'
                        AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108')
                        AND sdm."LABNO" NOT LIKE '_______8%'
                        AND sdm."DTRECV" >= TO_DATE(:date_from, 'YYYY-MM-DD HH24:MI:SS')
                        AND sdm."DTRECV" <= TO_DATE(:date_to, 'YYYY-MM-DD HH24:MI:SS')
                    GROUP BY 
                        rpa."DESCR1", rpa."COUNTY"
                )
                GROUP BY facility_name, province
                ORDER BY unsatisfactory_count DESC
            ) WHERE ROWNUM <= 20
        `;
        const result = await connection.execute(
            query,
            { date_from: from, date_to: to }, 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log("🔹 Query executed successfully. Data:", result.rows);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No data found" });
        }

        res.json(result.rows);
    } catch (err) {
        console.error("❌ Database error:", err.message, err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});


router.get("/details-unsatisfactory", async (req, res) => {
    try {
        const connection = req.app.locals.oracleDb;
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        const { from, to, facility_name } = req.query;

        if (!from || !to || !facility_name) {
            return res.status(400).json({ error: "Missing 'from', 'to', or 'facility_name' parameters" });
        }

        // Extract just the date part if datetime is provided
        const fromDate = from.split(' ')[0];
        const toDate = to.split(' ')[0];

        console.log(`🔍 Fetching unsatisfactory results from ${fromDate} to ${toDate} for facility "${facility_name}"`);

        const sql = `
            SELECT 
                sda."LABNO" AS labno, 
                MIN(sda."FNAME") AS first_name, 
                MIN(sda."LNAME") AS last_name,
                MIN(ldr."DESCR1") AS test_result,
                MIN(rpa."DESCR1") AS facility_name
            FROM 
                "PHMSDS"."REF_PROVIDER_ADDRESS" rpa
            JOIN 
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sda 
                ON rpa."PROVIDERID" = sda."SUBMID"
            JOIN 
                "PHMSDS"."RESULT_ARCHIVE" ra 
                ON sda."LABNO" = ra."LABNO"
            JOIN 
                "PHMSDS"."LIB_DISORDER_RESULT" ldr 
                ON ra."MNEMONIC" = ldr."MNEMONIC"
            WHERE 
                rpa."ADRS_TYPE" = '1'
                AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108')
                AND sda."LABNO" NOT LIKE '_______8%'
                AND TRUNC(sda."DTRECV") BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') AND TO_DATE(:date_to, 'YYYY-MM-DD')
                AND UPPER(rpa."DESCR1") = UPPER(:facility_name)
            GROUP BY sda."LABNO"

            UNION ALL

            SELECT 
                sdm."LABNO" AS labno, 
                MIN(sdm."FNAME") AS first_name, 
                MIN(sdm."LNAME") AS last_name,
                MIN(ldr."DESCR1") AS test_result,
                MIN(rpa."DESCR1") AS facility_name
            FROM 
                "PHMSDS"."REF_PROVIDER_ADDRESS" rpa
            JOIN 
                "PHMSDS"."SAMPLE_DEMOG_MASTER" sdm 
                ON rpa."PROVIDERID" = sdm."SUBMID"
            JOIN 
                "PHMSDS"."RESULT_MASTER" rm 
                ON sdm."LABNO" = rm."LABNO"
            JOIN 
                "PHMSDS"."LIB_DISORDER_RESULT" ldr 
                ON rm."MNEMONIC" = ldr."MNEMONIC"
            WHERE 
                rpa."ADRS_TYPE" = '1'
                AND ldr."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108')
                AND sdm."LABNO" NOT LIKE '_______8%'
                AND TRUNC(sdm."DTRECV") BETWEEN TO_DATE(:date_from, 'YYYY-MM-DD') AND TO_DATE(:date_to, 'YYYY-MM-DD')
                AND UPPER(rpa."DESCR1") = UPPER(:facility_name)
            GROUP BY sdm."LABNO"
            ORDER BY labno
        `;

        const result = await connection.execute(
            sql,
            {
                date_from: fromDate,
                date_to: toDate,
                facility_name
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            console.log(`⚠️ No data found for facility: ${facility_name}`);
            return res.json([]); // Return empty array instead of 404 for better UX
        }

        console.log("✅ Query successful. Rows returned:", result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error during /details-unsatisfactory:", error.message);
        res.status(500).json({ error: "Database error", details: error.message });
    }
});


module.exports = router;