// ===== CORRECTED BACKEND (Express Route) =====
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

        // Get labno from query parameters
        const { labno } = req.query;
        
        // Validate required parameter
        if (!labno) {
            return res.status(400).json({ 
                success: false,
                error: "labno parameter is required" 
            });
        }

        console.log(`Received request for labno: ${labno}`);

        // Simplified SQL query - using your original structure
        const sql = `
            SELECT DISTINCT
                SDA."LABNO", 
                SDA."LNAME", 
                SDA."FNAME", 
                SDA."DTRECV", 
                SDA."SUBMID",
                RPA."ADRS_TYPE", 
                RPA."DESCR1" AS FACILITY_NAME,
                LDR."DESCR1" AS TEST_RESULT
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" SDA,
                "PHMSDS"."REF_PROVIDER_ADDRESS" RPA,
                "PHMSDS"."DISORDER_ARCHIVE" DA,
                "PHMSDS"."LIB_DISORDER_RESULT" LDR
            WHERE
                SDA."SUBMID" = RPA."PROVIDERID" AND
                SDA."LABNO" = DA."LABNO" AND
                DA."MNEMONIC" = LDR."MNEMONIC" AND
                DA."REPTCODE" = LDR."REPTCODE" AND
                LDR."MNEMONIC" IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NE', 'E108') AND
                SDA."LABNO" = :labno AND
                RPA."ADRS_TYPE" = '1'
            ORDER BY SDA."LABNO" ASC
        `;

        console.log(`Executing SQL query for labno: ${labno}`);

        // Execute query with different options depending on your Oracle setup
        let result;
        try {
            // Try with OBJECT format first
            result = await oracleDb.execute(sql, { labno: labno }, {
                outFormat: db.OBJECT || db.OUT_FORMAT_OBJECT
            });
        } catch (formatError) {
            console.log('OBJECT format failed, trying default format:', formatError.message);
            // Fallback to default format
            result = await oracleDb.execute(sql, { labno: labno });
        }

        console.log(`Query executed successfully. Rows returned: ${result.rows?.length || 0}`);
        
        // Log the structure of the first row for debugging
        if (result.rows && result.rows.length > 0) {
            console.log('First row structure:', result.rows[0]);
            console.log('Row type:', typeof result.rows[0]);
            console.log('Is array:', Array.isArray(result.rows[0]));
        }
        
        // Return the data with success flag
        res.json({
            success: true,
            data: result.rows || [],
            count: result.rows?.length || 0,
            debug: {
                query: sql,
                params: { labno },
                rowType: result.rows?.length > 0 ? typeof result.rows[0] : 'no data'
            }
        });

    } catch (error) {
        console.error('Database query error:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

module.exports = router;