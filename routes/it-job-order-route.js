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
            status: row.status || 'Pending',
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
            status: row.status || "Pending",
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
    const allowedStatuses = ['PENDING', 'QUEUED', 'IN PROGRESS', 'CLOSED'];

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
            (status || 'Pending').toUpperCase(),
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
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
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
            status: row.status || "Pending",
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