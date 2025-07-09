const express = require("express");
const router = express.Router();
const db = require("../config/oracleConnection");

router.get("/", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb;

        if (!oracleDb) {
            return res.status(500).json({ 
                success: false,
                error: "OracleDB is not connected" 
            });
        }  

        const { labno } = req.query;
        
        if (!labno) {
            return res.status(400).json({ 
                success: false,
                error: "labno parameter is required" 
            });
        }

        console.log(`Received request for labno: ${labno}`);

        const mergedSql = `
            SELECT DISTINCT
                "LABNO", "LNAME", "FNAME", "DTRECV", "SUBMID",
                "ADRS_TYPE", "FACILITY_NAME", "TEST_RESULT"
            FROM (
                SELECT 
                    SDA."LABNO", SDA."LNAME", SDA."FNAME", SDA."DTRECV", SDA."SUBMID",
                    RPA."ADRS_TYPE", RPA."DESCR1" AS FACILITY_NAME,
                    LDR."DESCR1" AS TEST_RESULT
                FROM
                    "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA
                    JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA ON SDA."SUBMID" = RPA."PROVIDERID"
                    JOIN "PHMSDS"."DISORDER_ARCHIVE" DA ON SDA."LABNO" = DA."LABNO"
                    JOIN "PHMSDS"."LIB_DISORDER_RESULT" LDR ON DA."MNEMONIC" = LDR."MNEMONIC" AND DA."REPTCODE" = LDR."REPTCODE"
                WHERE
                    LDR."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108') AND
                    SDA."LABNO" = :labno AND
                    RPA."ADRS_TYPE" = '1'

                UNION

                SELECT 
                    SDM."LABNO", SDM."LNAME", SDM."FNAME", SDM."DTRECV", SDM."SUBMID",
                    RPA."ADRS_TYPE", RPA."DESCR1" AS FACILITY_NAME,
                    LDR."DESCR1" AS TEST_RESULT
                FROM
                    "PHMSDS"."SAMPLE_DEMOG_MASTER" SDM
                    JOIN "PHMSDS"."REF_PROVIDER_ADDRESS" RPA ON SDM."SUBMID" = RPA."PROVIDERID"
                    JOIN "PHMSDS"."DISORDER_MASTER" DM ON SDM."LABNO" = DM."LABNO"
                    JOIN "PHMSDS"."LIB_DISORDER_RESULT" LDR ON DM."MNEMONIC" = LDR."MNEMONIC" AND DM."REPTCODE" = LDR."REPTCODE"
                WHERE
                    LDR."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108') AND
                    SDM."LABNO" = :labno AND
                    RPA."ADRS_TYPE" = '1'
            )
            ORDER BY "LABNO" ASC
        `;

        console.log(`Executing merged SQL query for labno: ${labno}`);

        let result;
        try {
            result = await oracleDb.execute(mergedSql, { labno }, {
                outFormat: db.OBJECT || db.OUT_FORMAT_OBJECT
            });
        } catch (formatError) {
            console.log('OBJECT format failed, trying default format:', formatError.message);
            result = await oracleDb.execute(mergedSql, { labno });
        }

        console.log(`Query executed. Rows: ${result.rows?.length || 0}`);

        res.json({
            success: true,
            data: result.rows || [],
            count: result.rows?.length || 0,
            debug: {
                query: mergedSql,
                params: { labno },
                rowType: result.rows?.length > 0 ? typeof result.rows[0] : 'no data'
            }
        });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

module.exports = router;
