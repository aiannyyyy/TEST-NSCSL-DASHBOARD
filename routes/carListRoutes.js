const express = require("express");
const router = express.Router();
const db = require("../config/mysqlConnection");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Enhanced Multer Setup with better error handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "..", "uploads");
        try {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        } catch (error) {
            console.error("Error creating upload directory:", error);
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        try {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const safeFilename = uniqueSuffix + path.extname(file.originalname);
            cb(null, safeFilename);
        } catch (error) {
            cb(error, null);
        }
    },
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Add basic file type validation
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Error: File type not supported'));
        }
    }
});

// Enhanced facility details endpoint with better error handling
router.get('/getFacilityDetails', async (req, res) => {
    try {
        console.log('Facility details request received:', req.query);
        
        const oracleDb = req.app.locals.oracleDb;

        if (!oracleDb) {
            console.error("OracleDB connection not available");
            return res.status(500).json({ 
                error: "Database connection not available",
                message: "Oracle database is not connected"
            });
        }

        const { facilitycode } = req.query;

        if (!facilitycode || !facilitycode.trim()) {
            return res.status(400).json({ 
                error: "Validation Error",
                message: "Facility code is required and cannot be empty"
            });
        }

        const trimmedFacilityCode = facilitycode.toString().trim();
        
        // Enhanced query with better error handling
        const query = `
            SELECT
                REF_PROVIDER_ADDRESS."PROVIDERID",
                REF_PROVIDER_ADDRESS."DESCR1",
                REF_PROVIDER_ADDRESS."CITY", 
                REF_PROVIDER_ADDRESS."COUNTY"
            FROM
                "PHMSDS"."REF_PROVIDER_ADDRESS" REF_PROVIDER_ADDRESS
            WHERE
                REF_PROVIDER_ADDRESS."ADRS_TYPE" = '1'
                AND UPPER(TRIM(REF_PROVIDER_ADDRESS."PROVIDERID")) = UPPER(:facilitycode)
            ORDER BY REF_PROVIDER_ADDRESS."PROVIDERID" ASC
        `;

        const binds = { facilitycode: trimmedFacilityCode };
        
        console.log('Executing Oracle query with binds:', binds);

        const result = await oracleDb.execute(query, binds, {
            outFormat: oracleDb.OUT_FORMAT_OBJECT
        });

        console.log(`Query returned ${result.rows?.length || 0} results`);

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                message: "No facility found with the provided code",
                facilitycode: trimmedFacilityCode
            });
        }

        res.json({
            success: true,
            data: result.rows,
            facilitycode: trimmedFacilityCode
        });

    } catch (error) {
        console.error("Oracle database query error:", error);
        res.status(500).json({ 
            error: "Database Query Error", 
            message: error.message,
            facilitycode: req.query.facilitycode
        });
    }
});

// Get all car list with enhanced error handling
router.get("/car-list", (req, res) => {
    const query = "SELECT * FROM test_list_car ORDER BY date_endorsed DESC";
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("MySQL query error:", err);
            return res.status(500).json({ 
                error: "Database Query Error",
                message: err.message,
                code: err.code
            });
        }
        
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    });
});

router.post("/add-car", upload.single("attachment"), (req, res) => {
    console.log("\n=== ADD-CAR ROUTE DEBUG START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request headers:", req.headers);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("File info:", req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
    } : "No file uploaded");

    try {
        // Test database connection first
        db.query("SELECT 1 as connection_test", (connectionErr, connectionResult) => {
            if (connectionErr) {
                console.error("Database connection FAILED:", connectionErr);
                return res.status(500).json({
                    error: "Database Connection Error",
                    message: "Cannot connect to database",
                    details: connectionErr.message
                });
            }

            console.log("Database connection test PASSED");

            // Extract and validate form data
            const {
                case_no,
                date_endorsed,
                endorsed_by,
                facility_code,
                facility_name,
                city,
                province,
                labno,
                repeat_field,
                status,
                number_sample,
                case_code,
                sub_code1,
                sub_code2,
                sub_code3,
                sub_code4,
                remarks,
                frc,
                wrc,
                prepared_by,
                followup_on,
                reviewed_on,
                closed_on,
            } = req.body;

            console.log("Extracted form data:");
            console.log("- case_no:", case_no);
            console.log("- date_endorsed:", date_endorsed);
            console.log("- facility_code:", facility_code);
            console.log("- facility_name:", facility_name);
            console.log("- city:", city);
            console.log("- province:", province);

            // Validate required fields
            const missingFields = [];
            if (!case_no || !case_no.trim()) missingFields.push('case_no');
            if (!date_endorsed) missingFields.push('date_endorsed');
            if (!facility_code || !facility_code.trim()) missingFields.push('facility_code');

            if (missingFields.length > 0) {
                console.error("Missing required fields:", missingFields);
                return res.status(400).json({
                    error: "Validation Error",
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    missingFields: missingFields
                });
            }

            // File path handling
            const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;
            console.log("Attachment path:", attachment_path);

            // Remove 'id' from the INSERT if it exists in your current query
            const sql = `
                INSERT INTO test_list_car 
                (case_no, date_endorsed, endorsed_by, facility_code, facility_name, city, province, labno,
                repeat_field, status, number_sample, case_code, sub_code1, sub_code2, sub_code3, sub_code4,
                remarks, frc, wrc, prepared_by, followup_on, reviewed_on, closed_on, attachment_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Prepare values array
            const values = [
                case_no?.trim() || null,
                date_endorsed || null,
                endorsed_by?.trim() || null,
                facility_code?.trim() || null,
                facility_name?.trim() || null,
                city?.trim() || null,
                province?.trim() || null,
                labno?.trim() || null,
                repeat_field?.trim() || null,
                status?.trim() || null,
                number_sample ? parseInt(number_sample) : null,
                case_code?.trim() || null,
                sub_code1?.trim() || null,
                sub_code2?.trim() || null,
                sub_code3?.trim() || null,
                sub_code4?.trim() || null,
                remarks?.trim() || null,
                frc?.trim() || null,
                wrc?.trim() || null,
                prepared_by?.trim() || null,
                followup_on || null,
                reviewed_on || null,
                closed_on || null,
                attachment_path
            ];

            console.log("SQL Query:", sql);
            console.log("Values array:", values);
            console.log("Values count:", values.length);

            // Execute the insert
            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error("=== DATABASE INSERT ERROR ===");
                    console.error("Error code:", err.code);
                    console.error("Error message:", err.message);
                    console.error("SQL State:", err.sqlState);
                    console.error("Error number:", err.errno);
                    console.error("Full error object:", err);

                    // Handle specific MySQL errors
                    let errorMessage = "Database insert failed";
                    let statusCode = 500;

                    switch (err.code) {
                        case 'ER_DUP_ENTRY':
                            errorMessage = "Duplicate entry: A record with this case number may already exist";
                            statusCode = 409;
                            break;
                        case 'ER_NO_SUCH_TABLE':
                            errorMessage = "Database table 'test_list_car' not found";
                            statusCode = 500;
                            break;
                        case 'ER_BAD_FIELD_ERROR':
                            errorMessage = "Database column mismatch - check table structure";
                            statusCode = 500;
                            break;
                        case 'ER_WRONG_VALUE_COUNT_ON_ROW':
                            errorMessage = "Column count doesn't match value count";
                            statusCode = 500;
                            break;
                        case 'ER_DATA_TOO_LONG':
                            errorMessage = "Data too long for one or more columns";
                            statusCode = 400;
                            break;
                        case 'ER_BAD_NULL_ERROR':
                            errorMessage = "NULL value not allowed in required field";
                            statusCode = 400;
                            break;
                    }

                    return res.status(statusCode).json({
                        error: "Database Insert Error",
                        message: errorMessage,
                        details: err.message,
                        code: err.code,
                        sqlState: err.sqlState,
                        errno: err.errno
                    });
                }

                console.log("=== INSERT SUCCESS ===");
                console.log("Insert ID:", result.insertId);
                console.log("Affected rows:", result.affectedRows);
                console.log("Result object:", result);

                // Success response
                const response = {
                    success: true,
                    message: "Record added successfully",
                    id: result.insertId,
                    affectedRows: result.affectedRows,
                    data: {
                        case_no: case_no,
                        date_endorsed: date_endorsed,
                        facility_code: facility_code,
                        attachment: req.file ? {
                            filename: req.file.filename,
                            originalname: req.file.originalname,
                            size: req.file.size
                        } : null
                    }
                };

                console.log("Sending success response:", response);
                res.status(201).json(response);
            });
        });

    } catch (error) {
        console.error("=== ROUTE CATCH ERROR ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            error: "Internal Server Error",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

    console.log("=== ADD-CAR ROUTE DEBUG END ===\n");
});

// Enhanced database connection test
router.get("/test-db", (req, res) => {
    const mysqlTest = new Promise((resolve, reject) => {
        db.query("SELECT 1 as mysql_test, NOW() as current_time", (err, results) => {
            if (err) reject({ db: 'mysql', error: err.message });
            else resolve({ db: 'mysql', result: results[0], status: 'connected' });
        });
    });

    const oracleTest = new Promise((resolve, reject) => {
        const oracleDb = req.app.locals.oracleDb;
        if (!oracleDb) {
            resolve({ db: 'oracle', status: 'not_configured' });
        } else {
            oracleDb.execute("SELECT 1 as oracle_test FROM DUAL")
                .then(result => resolve({ db: 'oracle', result: result.rows[0], status: 'connected' }))
                .catch(err => reject({ db: 'oracle', error: err.message }));
        }
    });

    Promise.allSettled([mysqlTest, oracleTest])
        .then(results => {
            const response = {
                timestamp: new Date().toISOString(),
                databases: {}
            };

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    response.databases[result.value.db] = result.value;
                } else {
                    response.databases[result.reason.db] = {
                        status: 'error',
                        error: result.reason.error
                    };
                }
            });

            const allConnected = Object.values(response.databases)
                .every(db => db.status === 'connected' || db.status === 'not_configured');

            res.status(allConnected ? 200 : 500).json(response);
        });
});

module.exports = router;