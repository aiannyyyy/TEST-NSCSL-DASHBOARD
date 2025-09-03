/*
const express = require('express');
const router = express.Router();
const db = require("../config/mysqlConnection");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and documents are allowed'));
        }
    }
});

// Helper function to format date consistently
function formatDateForMySQL(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get all IT job orders with better error handling
router.get("/it-job-order", (req, res) => {
    const query = `
        SELECT 
            id,
            work_order_no,
            title,
            description,
            date_issued,
            requester,
            department,
            status,
            type,
            priority,
            date_resolved,
            tech,
            reason,
            approved,
            approved_by,
            approved_date,
            action_taken,
            time_elapsed,
            attachment_path
        FROM test_it_job_order 
        ORDER BY date_issued DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                error: 'Database error occurred',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        
        // Process results to ensure proper data formatting
        const processedResults = results.map(row => ({
            ...row,
            // Keep original date objects for proper timezone handling
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || 'Ongoing',
            priority: row.priority || 'LOW'
        }));
        
        res.json(processedResults);
    });
});

// Get IT job orders filtered by department and approved
router.get("/it-job-order-bydept", (req, res) => {
    const { department, approved } = req.query;

    // Base query
    let query = `
        SELECT 
            id,
            work_order_no,
            title,
            description,
            date_issued,
            requester,
            department,
            status,
            type,
            priority,
            date_resolved,
            tech,
            reason,
            approved,
            approved_by,
            approved_date,
            action_taken,
            time_elapsed,
            attachment_path
        FROM test_it_job_order
        WHERE 1=1
    `;

    const params = [];

    // Add department filter if provided
    if (department) {
        query += ` AND department = ?`;
        params.push(department);
    }

    // Add approved filter if provided
    if (approved) {
        query += ` AND approved = ?`;
        params.push(approved);
    }

    query += ` ORDER BY date_issued DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error occurred",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            });
        }

        // Process results to ensure proper data formatting
        const processedResults = results.map(row => ({
            ...row,
            // Keep original date objects
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "Ongoing",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});

// Get next work order number (corrected for WORK-YYYY-0000 format)
router.get("/get-next-work-order-no", (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    
    const query = `
        SELECT work_order_no 
        FROM test_it_job_order 
        WHERE work_order_no LIKE 'WORK-${year}-%' 
        ORDER BY CAST(SUBSTRING(work_order_no, -4) AS UNSIGNED) DESC 
        LIMIT 1
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while getting next work order:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        let nextNumber = 1;
        
        if (results.length > 0 && results[0].work_order_no) {
            const lastWorkOrderNo = results[0].work_order_no;
            const parts = lastWorkOrderNo.split('-');
            
            if (parts.length >= 3) {
                const lastNumber = parseInt(parts[2]);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
            
            console.log(`Last work order: ${lastWorkOrderNo}, Next number: ${nextNumber}`);
        }
        
        // Format with 4 digits padding
        const nextWorkOrderNo = `WORK-${year}-${nextNumber.toString().padStart(4, '0')}`;
        
        console.log(`Generated next work order number: ${nextWorkOrderNo}`);
        res.json({ next_work_order_no: nextWorkOrderNo });
    });
});

// CORRECTED create job order route
router.post("/add-it-job-order", upload.single('attachment'), (req, res) => {
    console.log('📥 Received job order request');
    console.log('📋 Request body:', req.body);
    console.log('📎 File:', req.file);
    
    const { 
        title, 
        description, 
        date_issued, 
        requester, 
        department, 
        status, 
        type, 
        priority
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !requester || !department || !type) {
        console.log('❌ Missing required fields');
        
        // Clean up uploaded file if validation fails
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }
        
        return res.status(400).json({ 
            error: 'Missing required fields: title, description, requester, department, and type are required' 
        });
    }
    
    // Validate allowed values
    const allowedTypes = ['PRINTER', 'DATABASE UPDATE', 'REPORT GENERATION', 
                         'ACCESS AND SECURITY', 'LAN AND NETWORKS', 'HARDWARE', 
                         'SOFTWARE', 'OTHERS'];
    const allowedPriorities = ['LOW', 'MID', 'HIGH'];
    const allowedStatuses = ['ONGOING', 'QUEUED', 'IN PROGRESS', 'CLOSED'];

    if (!allowedTypes.includes(type.toUpperCase())) {
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }
        return res.status(400).json({ error: 'Invalid job type' });
    }

    if (priority && !allowedPriorities.includes(priority.toUpperCase())) {
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }
        return res.status(400).json({ error: 'Invalid priority level' });
    }
    
    const attachment_path = req.file ? req.file.filename : null;
    const currentYear = new Date().getFullYear();

    // Get the next work order number
    const getLastWorkOrderQuery = `
        SELECT work_order_no 
        FROM test_it_job_order 
        WHERE work_order_no LIKE 'WORK-${currentYear}-%' 
        ORDER BY CAST(SUBSTRING(work_order_no, -4) AS UNSIGNED) DESC 
        LIMIT 1
    `;

    db.query(getLastWorkOrderQuery, (err, results) => {
        if (err) {
            console.error('Database error while getting last work order:', err);
            
            // Clean up uploaded file if there's an error
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }
            
            return res.status(500).json({ error: 'Failed to generate work order number' });
        }

        let nextNumber = 1;
        
        if (results.length > 0 && results[0].work_order_no) {
            const lastWorkOrderNo = results[0].work_order_no;
            const parts = lastWorkOrderNo.split('-');
            
            if (parts.length >= 3) {
                const lastNumber = parseInt(parts[2]);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
        }

        // Generate the work order number
        const work_order_no = `WORK-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
        
        console.log(`Generated work order number: ${work_order_no}`);

        // FIXED: Insert only initial fields - approved_date stays NULL until approved
        const insertQuery = `
            INSERT INTO test_it_job_order (
                work_order_no, 
                title, 
                description, 
                date_issued, 
                requester, 
                department, 
                status, 
                type, 
                priority, 
                approved,
                attachment_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // FIXED: Prepare values with proper formatting and defaults
        const currentDateTime = formatDateForMySQL(date_issued || new Date());
        
        const values = [
            work_order_no,
            title,
            description,
            currentDateTime,
            requester,
            department,
            (status || 'Ongoing').toUpperCase(),
            type.toUpperCase(),
            (priority || 'LOW').toUpperCase(),
            'NO', // FIXED: Always start as 'NO', ignore any approved parameter
            attachment_path
        ];
        // REMOVED: approved_date - let it stay NULL until actually approved

        console.log('💾 Inserting with values:', values);

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error('Database error while inserting job order:', err);
                
                // Clean up uploaded file if database insert fails
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                    });
                }
                
                return res.status(500).json({ 
                    error: 'Failed to create job order', 
                    details: err.message 
                });
            }

            console.log('✅ Job order created successfully:', {
                id: result.insertId,
                work_order_no: work_order_no
            });

            res.status(201).json({
                message: 'Job order created successfully',
                id: result.insertId,
                work_order_no: work_order_no
            });
        });
    });
});

// Test endpoint to verify API is working
router.get("/test", (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date() });
});

// Test database connection
router.get("/test-db", (req, res) => {
    db.query('SELECT COUNT(*) as count FROM test_it_job_order', (err, results) => {
        if (err) {
            console.error('DB Error:', err);
            return res.status(500).json({ error: 'Database connection failed', details: err.message });
        }
        res.json({ 
            message: 'Database connected successfully', 
            recordCount: results[0].count,
            timestamp: new Date()
        });
    });
});

// Serve uploaded files
router.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(path.resolve(filePath));
});

// Get statistics (optional)
router.get("/it-job-order-stats", (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as ongoing,
            SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
            SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) as queued,
            SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END) as high_priority,
            AVG(time_elapsed) as avg_time_elapsed
        FROM test_it_job_order
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error occurred' });
        }
        
        res.json(results[0]);
    });
});

// FIXED: Update job order approval status
router.post("/update-approval", (req, res) => {
    const { work_order_no, approved, approved_by } = req.body;

    if (!work_order_no || approved === undefined) {
        return res.status(400).json({ error: 'work_order_no and approved status are required' });
    }

    const query = `
        UPDATE test_it_job_order 
        SET approved = ?, approved_by = ?, approved_date = ?
        WHERE work_order_no = ?
    `;

    // FIXED: Only set approved_date when actually approving
    const approvedValue = approved === true || approved === 'true' || approved === 'YES' || approved === 'yes';
    const approvedString = approvedValue ? 'YES' : 'NO';
    const approvedDate = approvedValue ? formatDateForMySQL(new Date()) : null;

    const values = [
        approvedString,
        approved_by,
        approvedDate, // NULL if rejecting, current datetime if approving
        work_order_no
    ];

    console.log('Updating approval with values:', values);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Database error while updating approval:', err);
            return res.status(500).json({ error: 'Failed to update approval status' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Job order not found' });
        }

        res.json({
            message: 'Approval status updated successfully',
            work_order_no: work_order_no,
            approved: approvedString
        });
    });
});

// Enhanced filtering route
router.get("/it-job-order-filtered", (req, res) => {
    const { department, approved, status } = req.query;

    let query = `
        SELECT 
            id,
            work_order_no,
            title,
            description,
            date_issued,
            requester,
            department,
            status,
            type,
            priority,
            date_resolved,
            tech,
            reason,
            approved,
            approved_by,
            approved_date,
            action_taken,
            time_elapsed,
            attachment_path
        FROM test_it_job_order
        WHERE 1=1
    `;

    const params = [];

    if (department) {
        query += ` AND department = ?`;
        params.push(department);
    }

    if (approved) {
        query += ` AND approved = ?`;
        params.push(approved);
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    query += ` ORDER BY date_issued DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error occurred",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            });
        }

        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "Ongoing",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});

// Updated: Mark work order as done with time elapsed calculation
router.post("/work-done", (req, res) => {
    const { work_order_no, tech, reason, action_taken, time_elapsed } = req.body;

    if (!work_order_no) {
        return res.status(400).json({ error: 'work_order_no is required' });
    }

    // Set current datetime as "date_resolved"
    const date_resolved = new Date();

    // First, get the date_issued to calculate time_elapsed if not provided
    const getDateQuery = `SELECT date_issued FROM test_it_job_order WHERE work_order_no = ?`;
    
    db.query(getDateQuery, [work_order_no], (err, results) => {
        if (err) {
            console.error("Database error while fetching date_issued:", err);
            return res.status(500).json({ error: "Failed to fetch job order details" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Job order not found" });
        }

        const dateIssued = results[0].date_issued;
        
        // Calculate time elapsed if not provided
        let calculatedTimeElapsed = time_elapsed;
        if (!calculatedTimeElapsed && dateIssued) {
            const issued = new Date(dateIssued);
            const resolved = new Date(date_resolved);
            const diffInMs = resolved - issued;
            calculatedTimeElapsed = Math.round(diffInMs / (1000 * 60 * 60) * 100) / 100; // Hours with 2 decimal places
        }

        const updateQuery = `
            UPDATE test_it_job_order 
            SET date_resolved = ?, tech = ?, reason = ?, action_taken = ?, status = 'Closed'
            WHERE work_order_no = ?
        `;

        const values = [
            date_resolved,
            tech || null,
            reason || null,
            action_taken || null,
            work_order_no
        ];

        console.log("Updating job order with values:", values);

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error("Database error while updating job order:", err);
                return res.status(500).json({ error: "Failed to update job order" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Job order not found" });
            }

            res.json({
                message: "Job order completed successfully",
                work_order_no
            });
        });
    });
});

// Route for putting work order on hold
// Add this route to your it-job-order routes file
router.post("/work-hold", (req, res) => {
    const { work_order_no, tech, reason, action_taken } = req.body;

    if (!work_order_no) {
        return res.status(400).json({ error: 'work_order_no is required' });
    }

    // For hold action: date_resolved = null (time_elapsed will be auto-calculated as null)
    const query = `
        UPDATE test_it_job_order 
        SET date_resolved = NULL, tech = ?, reason = ?, action_taken = ?, status = 'Hold'
        WHERE work_order_no = ?
    `;

    const values = [
        tech || null,
        reason || null,
        action_taken || null,
        work_order_no
    ];

    console.log("Putting job order on hold with values:", values);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database error while updating job order:", err);
            return res.status(500).json({ error: "Failed to update job order" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Job order not found" });
        }

        res.json({
            message: "Job order put on hold successfully",
            work_order_no
        });
    });
});

module.exports = router;
*/
const express = require('express');
const router = express.Router();
const db = require("../config/mysqlConnection");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and documents are allowed'));
        }
    }
});

// Helper function to format date consistently
function formatDateForMySQL(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// QUEUE SYSTEM HELPER FUNCTIONS
function hasOngoingJob(callback) {
    const query = "SELECT COUNT(*) as count FROM test_it_job_order WHERE status = 'ONGOING'";
    db.query(query, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results[0].count > 0);
    });
}

function getNextQueuedJob(callback) {
    const query = `
        SELECT id, work_order_no 
        FROM test_it_job_order 
        WHERE status = 'QUEUED' 
        ORDER BY date_issued ASC 
        LIMIT 1
    `;
    db.query(query, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results.length > 0 ? results[0] : null);
    });
}

function processNextInQueue(callback) {
    getNextQueuedJob((err, nextJob) => {
        if (err) {
            return callback(err);
        }
        
        if (nextJob) {
            const updateQuery = "UPDATE test_it_job_order SET status = 'ONGOING' WHERE id = ?";
            db.query(updateQuery, [nextJob.id], (updateErr, result) => {
                if (updateErr) {
                    return callback(updateErr);
                }
                console.log(`✅ Job ${nextJob.work_order_no} moved from QUEUED to ONGOING`);
                callback(null, nextJob);
            });
        } else {
            console.log('ℹ️ No jobs in queue to process');
            callback(null, null);
        }
    });
}

// FIXED: Create job order route - ALL new jobs start as 'FOR APPROVAL'
router.post("/add-it-job-order", upload.single('attachment'), (req, res) => {
    console.log('📥 Received job order request');
    
    const { 
        title, 
        description, 
        date_issued, 
        requester, 
        department, 
        type, 
        priority
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !requester || !department || !type) {
        console.log('❌ Missing required fields');
        
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }
        
        return res.status(400).json({ 
            error: 'Missing required fields: title, description, requester, department, and type are required' 
        });
    }
    
    // Validate allowed values
    const allowedTypes = ['PRINTER', 'DATABASE UPDATE', 'REPORT GENERATION', 
                         'ACCESS AND SECURITY', 'LAN AND NETWORKS', 'HARDWARE', 
                         'SOFTWARE', 'OTHERS'];
    const allowedPriorities = ['LOW', 'MID', 'HIGH'];

    if (!allowedTypes.includes(type.toUpperCase())) {
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }
        return res.status(400).json({ error: 'Invalid job type' });
    }

    if (priority && !allowedPriorities.includes(priority.toUpperCase())) {
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }
        return res.status(400).json({ error: 'Invalid priority level' });
    }
    
    const attachment_path = req.file ? req.file.filename : null;
    const currentYear = new Date().getFullYear();

    // Get the next work order number
    const getLastWorkOrderQuery = `
        SELECT work_order_no 
        FROM test_it_job_order 
        WHERE work_order_no LIKE 'WORK-${currentYear}-%' 
        ORDER BY CAST(SUBSTRING(work_order_no, -4) AS UNSIGNED) DESC 
        LIMIT 1
    `;

    db.query(getLastWorkOrderQuery, (err, results) => {
        if (err) {
            console.error('Database error while getting last work order:', err);
            
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }
            
            return res.status(500).json({ error: 'Failed to generate work order number' });
        }

        let nextNumber = 1;
        
        if (results.length > 0 && results[0].work_order_no) {
            const lastWorkOrderNo = results[0].work_order_no;
            const parts = lastWorkOrderNo.split('-');
            
            if (parts.length >= 3) {
                const lastNumber = parseInt(parts[2]);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
        }

        const work_order_no = `WORK-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
        
        console.log(`Generated work order number: ${work_order_no}`);

        // FIXED: ALL new job orders start as 'FOR APPROVAL'
        const insertQuery = `
            INSERT INTO test_it_job_order (
                work_order_no, 
                title, 
                description, 
                date_issued, 
                requester, 
                department, 
                status, 
                type, 
                priority, 
                approved,
                attachment_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const currentDateTime = formatDateForMySQL(date_issued || new Date());
        
        const values = [
            work_order_no,
            title,
            description,
            currentDateTime,
            requester,
            department,
            'FOR APPROVAL', // FIXED: Always start as 'FOR APPROVAL'
            type.toUpperCase(),
            (priority || 'LOW').toUpperCase(),
            'NO', // Always start as 'NO'
            attachment_path
        ];

        console.log('💾 Inserting with status FOR APPROVAL:', values);

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error('Database error while inserting job order:', err);
                
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                    });
                }
                
                return res.status(500).json({ 
                    error: 'Failed to create job order', 
                    details: err.message 
                });
            }

            console.log('✅ Job order created with FOR APPROVAL status:', {
                id: result.insertId,
                work_order_no: work_order_no
            });

            res.status(201).json({
                message: 'Job order created successfully and pending approval',
                id: result.insertId,
                work_order_no: work_order_no,
                status: 'FOR APPROVAL'
            });
        });
    });
});

// FIXED: Update approval status with proper queue logic
router.post("/update-approval", (req, res) => {
    const { work_order_no, approved, approved_by } = req.body;

    if (!work_order_no || approved === undefined) {
        return res.status(400).json({ error: 'work_order_no and approved status are required' });
    }

    // Determine if this is an approval or rejection
    const approvedValue = approved === true || approved === 'true' || approved === 'YES' || approved === 'yes';
    const approvedString = approvedValue ? 'YES' : 'NO';
    const approvedDate = approvedValue ? formatDateForMySQL(new Date()) : null;

    if (approvedValue) {
        // APPROVED: Check if there's already an ongoing job to determine next status
        hasOngoingJob((err, hasOngoing) => {
            if (err) {
                console.error('Error checking ongoing jobs:', err);
                return res.status(500).json({ error: 'Failed to check job queue status' });
            }

            // Determine next status based on queue
            const nextStatus = hasOngoing ? 'QUEUED' : 'ONGOING';
            
            console.log(`📋 Approving ${work_order_no} - Next status: ${nextStatus} (Has ongoing: ${hasOngoing})`);

            const updateQuery = `
                UPDATE test_it_job_order 
                SET approved = ?, approved_by = ?, approved_date = ?, status = ?
                WHERE work_order_no = ?
            `;

            const values = [
                approvedString,
                approved_by,
                approvedDate,
                nextStatus,
                work_order_no
            ];

            db.query(updateQuery, values, (err, result) => {
                if (err) {
                    console.error('Database error while updating approval:', err);
                    return res.status(500).json({ error: 'Failed to update approval status' });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Job order not found' });
                }

                console.log(`✅ Job ${work_order_no} approved and set to ${nextStatus}`);

                res.json({
                    message: `Job order approved and moved to ${nextStatus}`,
                    work_order_no: work_order_no,
                    approved: approvedString,
                    new_status: nextStatus
                });
            });
        });
    } else {
        // REJECTED: Just update approval fields, keep status as 'FOR APPROVAL'
        const updateQuery = `
            UPDATE test_it_job_order 
            SET approved = ?, approved_by = ?, approved_date = ?
            WHERE work_order_no = ?
        `;

        const values = [
            approvedString,
            approved_by,
            approvedDate,
            work_order_no
        ];

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error('Database error while updating approval:', err);
                return res.status(500).json({ error: 'Failed to update approval status' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Job order not found' });
            }

            console.log(`❌ Job ${work_order_no} rejected`);

            res.json({
                message: 'Job order rejected',
                work_order_no: work_order_no,
                approved: approvedString
            });
        });
    }
});

// FIXED: Work done route with queue processing - Updated to handle generated column properly
router.post("/work-done", (req, res) => {
    const { work_order_no, tech, reason, action_taken, time_elapsed } = req.body;

    if (!work_order_no) {
        return res.status(400).json({ error: 'work_order_no is required' });
    }

    const date_resolved = new Date();

    // Get the date_issued to calculate time_elapsed if not provided
    const getDateQuery = `SELECT date_issued FROM test_it_job_order WHERE work_order_no = ?`;
    
    db.query(getDateQuery, [work_order_no], (err, results) => {
        if (err) {
            console.error("Database error while fetching date_issued:", err);
            return res.status(500).json({ error: "Failed to fetch job order details" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Job order not found" });
        }

        const dateIssued = results[0].date_issued;
        
        // Calculate time elapsed if not provided
        let calculatedTimeElapsed = time_elapsed;
        if (!calculatedTimeElapsed && dateIssued) {
            const issued = new Date(dateIssued);
            const resolved = new Date(date_resolved);
            const diffInMs = resolved - issued;
            calculatedTimeElapsed = diffInMs / (1000 * 60 * 60); // Hours without rounding
        }

        // Update the current job to CLOSED (without time_elapsed since it's a generated column)
        const updateQuery = `
            UPDATE test_it_job_order 
            SET date_resolved = ?, tech = ?, reason = ?, action_taken = ?, status = 'CLOSED'
            WHERE work_order_no = ?
        `;

        const values = [
            date_resolved,
            tech || null,
            reason || null,
            action_taken || null,
            work_order_no
        ];

        console.log("🔄 Closing job order:", work_order_no);

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error("Database error while updating job order:", err);
                return res.status(500).json({ error: "Failed to update job order" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Job order not found" });
            }

            console.log(`✅ Job ${work_order_no} marked as CLOSED`);

            // Fetch the calculated time_elapsed from the database after update
            const fetchQuery = `SELECT time_elapsed FROM test_it_job_order WHERE work_order_no = ?`;
            
            db.query(fetchQuery, [work_order_no], (fetchErr, fetchResults) => {
                if (fetchErr) {
                    console.error("Error fetching time_elapsed:", fetchErr);
                }

                const dbTimeElapsed = fetchResults && fetchResults[0] ? fetchResults[0].time_elapsed : calculatedTimeElapsed;

                // QUEUE PROCESSING: Move next queued job to ongoing
                processNextInQueue((queueErr, nextJob) => {
                    if (queueErr) {
                        console.error('⚠️ Error processing queue after job completion:', queueErr);
                    }

                    const responseData = {
                        message: "Job order completed successfully",
                        work_order_no,
                        time_elapsed: dbTimeElapsed
                    };

                    if (nextJob) {
                        responseData.queue_update = {
                            message: `Job ${nextJob.work_order_no} moved from QUEUED to ONGOING`,
                            next_ongoing_job: nextJob.work_order_no
                        };
                        console.log(`🚦 Next job ${nextJob.work_order_no} moved to ONGOING`);
                    }

                    res.json(responseData);
                });
                });
            });
        });
    });

// FIXED: Work hold route
router.post("/work-hold", (req, res) => {
    const { work_order_no, tech, reason, action_taken } = req.body;

    if (!work_order_no) {
        return res.status(400).json({ error: 'work_order_no is required' });
    }

    const query = `
        UPDATE test_it_job_order 
        SET date_resolved = NULL, tech = ?, reason = ?, action_taken = ?, status = 'HOLD', time_elapsed = NULL
        WHERE work_order_no = ?
    `;

    const values = [
        tech || null,
        reason || null,
        action_taken || null,
        work_order_no
    ];

    console.log("🚧 Putting job order on hold:", work_order_no);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database error while updating job order:", err);
            return res.status(500).json({ error: "Failed to update job order" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Job order not found" });
        }

        console.log(`🚧 Job ${work_order_no} put on HOLD`);

        // When a job is put on hold, move next queued job to ongoing if no other ongoing jobs
        hasOngoingJob((err, hasOngoing) => {
            if (err) {
                console.error('Error checking ongoing jobs after hold:', err);
                return res.json({
                    message: "Job order put on hold successfully",
                    work_order_no
                });
            }

            if (!hasOngoing) {
                // No ongoing jobs, process next in queue
                processNextInQueue((queueErr, nextJob) => {
                    if (queueErr) {
                        console.error('Error processing queue after hold:', queueErr);
                    }

                    const responseData = {
                        message: "Job order put on hold successfully",
                        work_order_no
                    };

                    if (nextJob) {
                        responseData.queue_update = {
                            message: `Job ${nextJob.work_order_no} moved from QUEUED to ONGOING`,
                            next_ongoing_job: nextJob.work_order_no
                        };
                    }

                    res.json(responseData);
                });
            } else {
                res.json({
                    message: "Job order put on hold successfully",
                    work_order_no
                });
            }
        });
    });
});

// NEW: Resume job from hold
router.post("/work-resume", (req, res) => {
    const { work_order_no } = req.body;

    if (!work_order_no) {
        return res.status(400).json({ error: 'work_order_no is required' });
    }

    // Check if there's already an ongoing job
    hasOngoingJob((err, hasOngoing) => {
        if (err) {
            console.error('Error checking ongoing jobs:', err);
            return res.status(500).json({ error: 'Failed to check job queue status' });
        }

        const nextStatus = hasOngoing ? 'QUEUED' : 'ONGOING';
        
        const query = `
            UPDATE test_it_job_order 
            SET status = ?
            WHERE work_order_no = ? AND status = 'HOLD'
        `;

        db.query(query, [nextStatus, work_order_no], (err, result) => {
            if (err) {
                console.error("Database error while resuming job order:", err);
                return res.status(500).json({ error: "Failed to resume job order" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Job order not found or not on hold" });
            }

            console.log(`🔄 Job ${work_order_no} resumed with status ${nextStatus}`);

            res.json({
                message: `Job order resumed and moved to ${nextStatus}`,
                work_order_no,
                new_status: nextStatus
            });
        });
    });
});
/*
// Get all IT job orders
router.get("/it-job-order", (req, res) => {
    const query = `
        SELECT 
            id, work_order_no, title, description, date_issued, requester, department,
            status, type, priority, date_resolved, tech, reason, approved, approved_by,
            approved_date, action_taken, time_elapsed, attachment_path
        FROM test_it_job_order 
        ORDER BY date_issued DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                error: 'Database error occurred',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        
        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || 'FOR APPROVAL',
            priority: row.priority || 'LOW'
        }));
        
        res.json(processedResults);
    });
});
*/
// Update the main GET route for all IT job orders
router.get("/it-job-order", (req, res) => {
    const query = `
        SELECT 
            id, work_order_no, title, description, date_issued, requester, department,
            status, type, priority, date_resolved, tech, reason, approved, approved_by,
            approved_date, action_taken, time_elapsed, attachment_path
        FROM test_it_job_order 
        ORDER BY 
            CASE status
                WHEN 'ONGOING' THEN 1
                WHEN 'QUEUED' THEN 2
                WHEN 'HOLD' THEN 3
                WHEN 'FOR APPROVAL' THEN 4
                WHEN 'CLOSED' THEN 5
                ELSE 6
            END,
            date_issued DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                error: 'Database error occurred',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        
        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || 'FOR APPROVAL',
            priority: row.priority || 'LOW'
        }));
        
        res.json(processedResults);
    });
});
/*
// Get IT job orders filtered by department and approved
router.get("/it-job-order-bydept", (req, res) => {
    const { department, approved } = req.query;

    let query = `
        SELECT 
            id, work_order_no, title, description, date_issued, requester, department,
            status, type, priority, date_resolved, tech, reason, approved, approved_by,
            approved_date, action_taken, time_elapsed, attachment_path
        FROM test_it_job_order
        WHERE 1=1
    `;

    const params = [];

    if (department) {
        query += ` AND department = ?`;
        params.push(department);
    }

    if (approved) {
        query += ` AND approved = ?`;
        params.push(approved);
    }

    query += ` ORDER BY date_issued DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error occurred",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            });
        }

        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "FOR APPROVAL",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});
*/
// Update the filtered by department route
router.get("/it-job-order-bydept", (req, res) => {
    const { department, approved } = req.query;

    let query = `
        SELECT 
            id, work_order_no, title, description, date_issued, requester, department,
            status, type, priority, date_resolved, tech, reason, approved, approved_by,
            approved_date, action_taken, time_elapsed, attachment_path
        FROM test_it_job_order
        WHERE 1=1
    `;

    const params = [];

    if (department) {
        query += ` AND department = ?`;
        params.push(department);
    }

    if (approved) {
        query += ` AND approved = ?`;
        params.push(approved);
    }

    query += ` ORDER BY 
        CASE status
            WHEN 'ONGOING' THEN 1
            WHEN 'QUEUED' THEN 2
            WHEN 'HOLD' THEN 3
            WHEN 'FOR APPROVAL' THEN 4
            WHEN 'CLOSED' THEN 5
            ELSE 6
        END,
        date_issued DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error occurred",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            });
        }

        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "FOR APPROVAL",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});

// Get next work order number
router.get("/get-next-work-order-no", (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    
    const query = `
        SELECT work_order_no 
        FROM test_it_job_order 
        WHERE work_order_no LIKE 'WORK-${year}-%' 
        ORDER BY CAST(SUBSTRING(work_order_no, -4) AS UNSIGNED) DESC 
        LIMIT 1
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while getting next work order:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        let nextNumber = 1;
        
        if (results.length > 0 && results[0].work_order_no) {
            const lastWorkOrderNo = results[0].work_order_no;
            const parts = lastWorkOrderNo.split('-');
            
            if (parts.length >= 3) {
                const lastNumber = parseInt(parts[2]);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
        }
        
        const nextWorkOrderNo = `WORK-${year}-${nextNumber.toString().padStart(4, '0')}`;
        
        res.json({ next_work_order_no: nextWorkOrderNo });
    });
});

// Get queue status
router.get("/queue-status", (req, res) => {
    const query = `
        SELECT 
            COUNT(CASE WHEN status = 'ONGOING' THEN 1 END) as ongoing_count,
            COUNT(CASE WHEN status = 'QUEUED' THEN 1 END) as queued_count,
            COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_count,
            COUNT(CASE WHEN status = 'HOLD' THEN 1 END) as hold_count,
            COUNT(CASE WHEN status = 'FOR APPROVAL' THEN 1 END) as pending_approval_count
        FROM test_it_job_order
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error occurred' });
        }
        
        res.json({
            queue_status: results[0],
            timestamp: new Date()
        });
    });
});

/*
// Enhanced filtering route
router.get("/it-job-order-filtered", (req, res) => {
    const { department, approved, status } = req.query;

    let query = `
        SELECT 
            id, work_order_no, title, description, date_issued, requester, department,
            status, type, priority, date_resolved, tech, reason, approved, approved_by,
            approved_date, action_taken, time_elapsed, attachment_path
        FROM test_it_job_order
        WHERE 1=1
    `;

    const params = [];

    if (department) {
        query += ` AND department = ?`;
        params.push(department);
    }

    if (approved) {
        query += ` AND approved = ?`;
        params.push(approved);
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    query += ` ORDER BY date_issued DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error occurred",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            });
        }

        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "FOR APPROVAL",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});
*/
// Update the enhanced filtering route
router.get("/it-job-order-filtered", (req, res) => {
    const { department, approved, status } = req.query;

    let query = `
        SELECT 
            id, work_order_no, title, description, date_issued, requester, department,
            status, type, priority, date_resolved, tech, reason, approved, approved_by,
            approved_date, action_taken, time_elapsed, attachment_path
        FROM test_it_job_order
        WHERE 1=1
    `;

    const params = [];

    if (department) {
        query += ` AND department = ?`;
        params.push(department);
    }

    if (approved) {
        query += ` AND approved = ?`;
        params.push(approved);
    }

    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    query += ` ORDER BY 
        CASE status
            WHEN 'ONGOING' THEN 1
            WHEN 'QUEUED' THEN 2
            WHEN 'HOLD' THEN 3
            WHEN 'FOR APPROVAL' THEN 4
            WHEN 'CLOSED' THEN 5
            ELSE 6
        END,
        date_issued DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error occurred",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            });
        }

        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued,
            date_resolved: row.date_resolved,
            approved_date: row.approved_date,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "FOR APPROVAL",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});

// Get statistics
router.get("/it-job-order-stats", (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'ONGOING' THEN 1 ELSE 0 END) as ongoing,
            SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
            SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) as queued,
            SUM(CASE WHEN status = 'HOLD' THEN 1 ELSE 0 END) as hold,
            SUM(CASE WHEN status = 'FOR APPROVAL' THEN 1 ELSE 0 END) as pending_approval,
            SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END) as high_priority,
            AVG(time_elapsed) as avg_time_elapsed
        FROM test_it_job_order
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error occurred' });
        }
        
        res.json(results[0]);
    });
});

// Serve uploaded files
router.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(path.resolve(filePath));
});

// Test endpoints
router.get("/test", (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date() });
});

router.get("/test-db", (req, res) => {
    db.query('SELECT COUNT(*) as count FROM test_it_job_order', (err, results) => {
        if (err) {
            console.error('DB Error:', err);
            return res.status(500).json({ error: 'Database connection failed', details: err.message });
        }
        res.json({ 
            message: 'Database connected successfully', 
            recordCount: results[0].count,
            timestamp: new Date()
        });
    });
});

module.exports = router;