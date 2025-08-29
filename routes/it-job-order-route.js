const express = require('express');
const router = express.Router();
const db = require("../config/mysqlConnection");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'), // Fixed typo: destinatoin -> destination
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
            // Ensure dates are properly formatted
            date_issued: row.date_issued ? new Date(row.date_issued).toISOString() : null,
            date_resolved: row.date_resolved ? new Date(row.date_resolved).toISOString() : null,
            approved_date: row.approved_date ? new Date(row.approved_date).toISOString() : null,
            // Ensure work_order_no has a fallback
            work_order_no: row.work_order_no || `WO-${row.id}`,
            // Convert enum values to proper case
            status: row.status || 'Pending',
            priority: row.priority || 'LOW'
        }));
        
        res.json(processedResults);
    });
});

// Get IT job orders filtered by department and status
router.get("/it-job-order-bydept", (req, res) => {
    const { department, status } = req.query;

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

    // Add status filter if provided
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

        // Process results to ensure proper data formatting
        const processedResults = results.map(row => ({
            ...row,
            date_issued: row.date_issued ? new Date(row.date_issued).toISOString() : null,
            date_resolved: row.date_resolved ? new Date(row.date_resolved).toISOString() : null,
            approved_date: row.approved_date ? new Date(row.approved_date).toISOString() : null,
            work_order_no: row.work_order_no || `WO-${row.id}`,
            status: row.status || "Pending",
            priority: row.priority || "LOW",
        }));

        res.json(processedResults);
    });
});


// Create new job order
router.post("/add-it-job-order", upload.single('attachment'), (req, res) => {
    const {
        title,
        description,
        date_issued,
        requester,
        department,
        status = 'Pending',
        type,
        priority = 'LOW',
        date_resolved,
        tech,
        reason,
        approved_by,
        approved_date,
        action_taken,
        time_elapsed
    } = req.body;
    
    const attachment_path = req.file ? req.file.filename : null;
    const currentYear = new Date().getFullYear();
    
    // First, get the next work order number
    const getLastWorkOrderQuery = `
        SELECT work_order_no 
        FROM test_it_job_order 
        WHERE work_order_no LIKE 'WO-${currentYear}-%' 
        ORDER BY CAST(SUBSTRING(work_order_no, -3) AS UNSIGNED) DESC 
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
            // Extract the number from the last work order (e.g., "WO-2024-001" -> 1)
            const lastWorkOrderNo = results[0].work_order_no;
            const lastNumber = parseInt(lastWorkOrderNo.split('-')[2]);
            nextNumber = lastNumber + 1;
        }
        
        // Format the work order number with leading zeros (e.g., WO-2024-001)
        const work_order_no = `WO-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
        
        // Insert the new job order
        const insertQuery = `
            INSERT INTO test_it_job_order 
            (work_order_no, title, description, date_issued, requester, department, status, type, priority, date_resolved, tech, reason, approved_by, approved_date, action_taken, time_elapsed, attachment_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
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
            approved_by, 
            approved_date, 
            action_taken, 
            time_elapsed, 
            attachment_path
        ];
        
        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error('Database error while inserting job order:', err);
                // Clean up uploaded file if database insert fails
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                    });
                }
                return res.status(500).json({ error: 'Failed to create job order' });
            }
            
            res.status(201).json({
                message: 'Job order created successfully',
                id: result.insertId,
                work_order_no: work_order_no
            });
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
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
            SUM(CASE WHEN status = 'Queued' THEN 1 ELSE 0 END) as queued,
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

module.exports = router;