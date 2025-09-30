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

// PRIORITY QUEUE SYSTEM HELPER FUNCTIONS
function hasOngoingJob(callback) {
    const query = "SELECT COUNT(*) as count FROM test_it_job_order WHERE status = 'ONGOING'";
    db.query(query, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results[0].count > 0);
    });
}

function getCurrentOngoingJob(callback) {
    const query = `
        SELECT id, work_order_no, priority 
        FROM test_it_job_order 
        WHERE status = 'ONGOING' 
        LIMIT 1
    `;
    db.query(query, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results.length > 0 ? results[0] : null);
    });
}

// UPDATED: Priority-aware queue selection
function getNextQueuedJob(callback) {
    const query = `
        SELECT id, work_order_no, priority 
        FROM test_it_job_order 
        WHERE status = 'QUEUED' 
        ORDER BY 
            CASE priority
                WHEN 'HIGH' THEN 1
                WHEN 'MID' THEN 2
                WHEN 'LOW' THEN 3
                ELSE 4
            END,
            date_issued ASC 
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
                console.log(`Job ${nextJob.work_order_no} (${nextJob.priority}) moved from QUEUED to ONGOING`);
                callback(null, nextJob);
            });
        } else {
            console.log('No jobs in queue to process');
            callback(null, null);
        }
    });
}

// NEW: Priority-based job processing logic
function handlePriorityLogic(jobPriority, newJobId, callback) {
    // Only HIGH and MID priority jobs can potentially interrupt
    if (jobPriority !== 'HIGH' && jobPriority !== 'MID') {
        // LOW priority follows normal queue logic
        hasOngoingJob((err, hasOngoing) => {
            if (err) return callback(err);
            
            const nextStatus = hasOngoing ? 'QUEUED' : 'ONGOING';
            const updateQuery = "UPDATE test_it_job_order SET status = ? WHERE id = ?";
            
            db.query(updateQuery, [nextStatus, newJobId], (updateErr) => {
                if (updateErr) return callback(updateErr);
                
                console.log(`LOW priority job set to ${nextStatus}`);
                callback(null, { action: 'NORMAL_QUEUE', status: nextStatus });
            });
        });
        return;
    }

    // HIGH/MID priority logic
    getCurrentOngoingJob((err, ongoingJob) => {
        if (err) return callback(err);

        if (!ongoingJob) {
            // No ongoing job, go directly to ONGOING
            const updateQuery = "UPDATE test_it_job_order SET status = 'ONGOING' WHERE id = ?";
            db.query(updateQuery, [newJobId], (updateErr) => {
                if (updateErr) return callback(updateErr);
                
                console.log(`${jobPriority} priority job set to ONGOING (no current ongoing job)`);
                callback(null, { action: 'DIRECT_TO_ONGOING', status: 'ONGOING' });
            });
            return;
        }

        // There's an ongoing job, check priorities
        const ongoingPriority = ongoingJob.priority;
        const priorityValues = { 'HIGH': 3, 'MID': 2, 'LOW': 1 };
        const newJobPriorityValue = priorityValues[jobPriority] || 0;
        const ongoingPriorityValue = priorityValues[ongoingPriority] || 0;

        if (newJobPriorityValue > ongoingPriorityValue) {
            // New job has higher priority, interrupt current job
            const moveToQueueQuery = "UPDATE test_it_job_order SET status = 'QUEUED' WHERE id = ?";
            const moveToOngoingQuery = "UPDATE test_it_job_order SET status = 'ONGOING' WHERE id = ?";
            
            // Move current ongoing to queue first
            db.query(moveToQueueQuery, [ongoingJob.id], (queueErr) => {
                if (queueErr) return callback(queueErr);
                
                // Then move new job to ongoing
                db.query(moveToOngoingQuery, [newJobId], (ongoingErr) => {
                    if (ongoingErr) {
                        // Rollback: move job back to ongoing
                        db.query("UPDATE test_it_job_order SET status = 'ONGOING' WHERE id = ?", [ongoingJob.id], () => {
                            callback(ongoingErr);
                        });
                        return;
                    }
                    
                    console.log(`${jobPriority} priority job interrupted ${ongoingJob.work_order_no} (${ongoingPriority})`);
                    callback(null, { 
                        action: 'PRIORITY_INTERRUPT', 
                        status: 'ONGOING',
                        displaced_job: ongoingJob.work_order_no
                    });
                });
            });
        } else {
            // Same or lower priority, goes to queue
            const updateQuery = "UPDATE test_it_job_order SET status = 'QUEUED' WHERE id = ?";
            db.query(updateQuery, [newJobId], (updateErr) => {
                if (updateErr) return callback(updateErr);
                
                console.log(`${jobPriority} priority job queued (ongoing job has ${ongoingPriority} priority)`);
                callback(null, { action: 'QUEUED_BY_PRIORITY', status: 'QUEUED' });
            });
        }
    });
}

// Create job order route - ALL new jobs start as 'FOR APPROVAL'
router.post("/add-it-job-order", upload.single('attachment'), (req, res) => {
    console.log('Received job order request');
    
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
        console.log('Missing required fields');
        
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

        // ALL new job orders start as 'FOR APPROVAL'
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
            'FOR APPROVAL', // Always start as 'FOR APPROVAL'
            type.toUpperCase(),
            (priority || 'LOW').toUpperCase(),
            'NO', // Always start as 'NO'
            attachment_path
        ];

        console.log('Inserting with status FOR APPROVAL:', values);

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

            console.log('Job order created with FOR APPROVAL status:', {
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

// UPDATED: Approval route with priority queue logic
router.post("/update-approval", (req, res) => {
    const { work_order_no, approved, approved_by } = req.body;

    if (!work_order_no || approved === undefined) {
        return res.status(400).json({ error: 'work_order_no and approved status are required' });
    }

    const approvedValue = approved === true || approved === 'true' || approved === 'YES' || approved === 'yes';
    const approvedString = approvedValue ? 'YES' : 'NO';
    const approvedDate = approvedValue ? formatDateForMySQL(new Date()) : null;

    if (approvedValue) {
        // Get job details first to check priority
        const getJobQuery = "SELECT id, priority FROM test_it_job_order WHERE work_order_no = ?";
        
        db.query(getJobQuery, [work_order_no], (err, results) => {
            if (err) {
                console.error('Error fetching job details:', err);
                return res.status(500).json({ error: 'Failed to fetch job details' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Job order not found' });
            }

            const job = results[0];
            const jobPriority = job.priority;

            console.log(`Approving ${work_order_no} with ${jobPriority} priority`);

            // Apply priority logic
            handlePriorityLogic(jobPriority, job.id, (priorityErr, priorityResult) => {
                if (priorityErr) {
                    console.error('Error processing priority job:', priorityErr);
                    return res.status(500).json({ error: 'Failed to process job priority' });
                }

                // Update approval fields
                const updateQuery = `
                    UPDATE test_it_job_order 
                    SET approved = ?, approved_by = ?, approved_date = ?
                    WHERE work_order_no = ?
                `;

                const values = [approvedString, approved_by, approvedDate, work_order_no];

                db.query(updateQuery, values, (updateErr, result) => {
                    if (updateErr) {
                        console.error('Database error while updating approval:', updateErr);
                        return res.status(500).json({ error: 'Failed to update approval status' });
                    }

                    console.log(`Job ${work_order_no} approved and set to ${priorityResult.status}`);

                    // Response compatible with existing frontend
                    const response = {
                        message: `Job order approved and moved to ${priorityResult.status}`,
                        work_order_no: work_order_no,
                        approved: approvedString,
                        new_status: priorityResult.status
                    };

                    res.json(response);
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

        const values = [approvedString, approved_by, approvedDate, work_order_no];

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error('Database error while updating approval:', err);
                return res.status(500).json({ error: 'Failed to update approval status' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Job order not found' });
            }

            console.log(`Job ${work_order_no} rejected`);

            res.json({
                message: 'Job order rejected',
                work_order_no: work_order_no,
                approved: approvedString
            });
        });
    }
});

// Work done route with priority-aware queue processing
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
            calculatedTimeElapsed = diffInMs / (1000 * 60 * 60); // Hours
        }

        // Update the current job to CLOSED
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

        console.log("Closing job order:", work_order_no);

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error("Database error while updating job order:", err);
                return res.status(500).json({ error: "Failed to update job order" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Job order not found" });
            }

            console.log(`Job ${work_order_no} marked as CLOSED`);

            // Fetch the calculated time_elapsed from the database after update
            const fetchQuery = `SELECT time_elapsed FROM test_it_job_order WHERE work_order_no = ?`;
            
            db.query(fetchQuery, [work_order_no], (fetchErr, fetchResults) => {
                if (fetchErr) {
                    console.error("Error fetching time_elapsed:", fetchErr);
                }

                const dbTimeElapsed = fetchResults && fetchResults[0] ? fetchResults[0].time_elapsed : calculatedTimeElapsed;

                // PRIORITY QUEUE PROCESSING: Move next job to ongoing
                processNextInQueue((queueErr, nextJob) => {
                    if (queueErr) {
                        console.error('Error processing queue after job completion:', queueErr);
                    }

                    const responseData = {
                        message: "Job order completed successfully",
                        work_order_no,
                        time_elapsed: dbTimeElapsed
                    };

                    if (nextJob) {
                        console.log(`Next job ${nextJob.work_order_no} (${nextJob.priority}) moved to ONGOING`);
                    }

                    res.json(responseData);
                });
            });
        });
    });
});

// Work hold route
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

    console.log("Putting job order on hold:", work_order_no);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database error while updating job order:", err);
            return res.status(500).json({ error: "Failed to update job order" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Job order not found" });
        }

        console.log(`Job ${work_order_no} put on HOLD`);

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
                // No ongoing jobs, process next in queue with priority
                processNextInQueue((queueErr, nextJob) => {
                    if (queueErr) {
                        console.error('Error processing queue after hold:', queueErr);
                    }

                    const responseData = {
                        message: "Job order put on hold successfully",
                        work_order_no
                    };

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

// Resume job from hold
router.post("/work-resume", (req, res) => {
    const { work_order_no } = req.body;

    if (!work_order_no) {
        return res.status(400).json({ error: 'work_order_no is required' });
    }

    // Get job priority first
    const getJobQuery = "SELECT id, priority FROM test_it_job_order WHERE work_order_no = ? AND status = 'HOLD'";
    
    db.query(getJobQuery, [work_order_no], (err, results) => {
        if (err) {
            console.error('Error fetching job details:', err);
            return res.status(500).json({ error: 'Failed to fetch job details' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Job order not found or not on hold' });
        }

        const job = results[0];
        const jobPriority = job.priority;

        // Apply priority logic for resuming
        handlePriorityLogic(jobPriority, job.id, (priorityErr, priorityResult) => {
            if (priorityErr) {
                console.error('Error processing priority for resume:', priorityErr);
                return res.status(500).json({ error: 'Failed to process job priority' });
            }

            console.log(`Job ${work_order_no} resumed with status ${priorityResult.status}`);

            res.json({
                message: `Job order resumed and moved to ${priorityResult.status}`,
                work_order_no,
                new_status: priorityResult.status
            });
        });
    });
});

// Main GET route for all IT job orders with priority-aware ordering
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
            CASE priority
                WHEN 'HIGH' THEN 1
                WHEN 'MID' THEN 2
                WHEN 'LOW' THEN 3
                ELSE 4
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

// Filtered by department route with priority ordering
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
        CASE priority
            WHEN 'HIGH' THEN 1
            WHEN 'MID' THEN 2
            WHEN 'LOW' THEN 3
            ELSE 4
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

// Enhanced queue status with priority information
router.get("/queue-status", (req, res) => {
    const query = `
        SELECT 
            COUNT(CASE WHEN status = 'ONGOING' THEN 1 END) as ongoing_count,
            COUNT(CASE WHEN status = 'QUEUED' THEN 1 END) as queued_count,
            COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_count,
            COUNT(CASE WHEN status = 'HOLD' THEN 1 END) as hold_count,
            COUNT(CASE WHEN status = 'FOR APPROVAL' THEN 1 END) as pending_approval_count,
            COUNT(CASE WHEN status = 'QUEUED' AND priority = 'HIGH' THEN 1 END) as queued_high_priority,
            COUNT(CASE WHEN status = 'QUEUED' AND priority = 'MID' THEN 1 END) as queued_mid_priority,
            COUNT(CASE WHEN status = 'QUEUED' AND priority = 'LOW' THEN 1 END) as queued_low_priority
        FROM test_it_job_order
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error occurred' });
        }
        
        // Get current ongoing job details
        const ongoingQuery = `
            SELECT work_order_no, priority, title, requester
            FROM test_it_job_order 
            WHERE status = 'ONGOING'
            LIMIT 1
        `;
        
        db.query(ongoingQuery, (ongoingErr, ongoingResults) => {
            if (ongoingErr) {
                console.error('Error fetching ongoing job:', ongoingErr);
            }
            
            const response = {
                queue_status: results[0],
                current_ongoing: ongoingResults && ongoingResults.length > 0 ? ongoingResults[0] : null,
                timestamp: new Date()
            };
            
            res.json(response);
        });
    });
});

// Enhanced filtered route
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
        CASE priority
            WHEN 'HIGH' THEN 1
            WHEN 'MID' THEN 2
            WHEN 'LOW' THEN 3
            ELSE 4
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

// Get statistics with priority breakdown
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
            SUM(CASE WHEN priority = 'MID' THEN 1 ELSE 0 END) as mid_priority,
            SUM(CASE WHEN priority = 'LOW' THEN 1 ELSE 0 END) as low_priority,
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

// Get priority-aware queue order
router.get("/queue-order", (req, res) => {
    const query = `
        SELECT 
            work_order_no, title, requester, department, priority, date_issued,
            CASE 
                WHEN status = 'ONGOING' THEN 'Currently Working'
                WHEN status = 'QUEUED' THEN CONCAT('Position ', 
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE priority
                                WHEN 'HIGH' THEN 1
                                WHEN 'MID' THEN 2
                                WHEN 'LOW' THEN 3
                                ELSE 4
                            END,
                            date_issued ASC
                    )
                )
                ELSE status
            END as queue_position
        FROM test_it_job_order 
        WHERE status IN ('ONGOING', 'QUEUED')
        ORDER BY 
            CASE status WHEN 'ONGOING' THEN 0 ELSE 1 END,
            CASE priority
                WHEN 'HIGH' THEN 1
                WHEN 'MID' THEN 2
                WHEN 'LOW' THEN 3
                ELSE 4
            END,
            date_issued ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error occurred' });
        }
        
        res.json({
            queue_order: results,
            total_in_queue: results.filter(job => job.queue_position !== 'Currently Working').length,
            timestamp: new Date()
        });
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