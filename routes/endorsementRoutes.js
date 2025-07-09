/*
const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer configuration
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${cleanName}`);
    }
});

const fileFilter = (_, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    cb(allowedTypes.includes(file.mimetype) ? null : new Error('Invalid file type'), allowedTypes.includes(file.mimetype));
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// GET all endorsements
router.get('/', (req, res) => {
    console.log('=== GET ALL ENDORSEMENTS ===');
    const sql = `
        SELECT 
            id, labno, fname, lname, facility_code, facility_name, 
            test_result, remarks, attachment_path, date_endorsed, endorsed_by
        FROM test_endorsement 
        ORDER BY date_endorsed DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error in GET /:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        console.log(`Found ${results.length} endorsements`);
        res.json({ 
            success: true, 
            data: results, 
            count: results.length 
        });
    });
});


// POST new endorsement
router.post('/', upload.single('endorsementFile'), (req, res) => {
    console.log('=== POST NEW ENDORSEMENT ===');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { 
        labno, 
        fname, 
        lname, 
        facility_code, 
        facility_name, 
        test_result, 
        remarks, 
        date_endorsed, 
        endorsed_by 
    } = req.body;
    
    // Enhanced validation
    const validationErrors = [];
    if (!labno || labno.trim() === '') validationErrors.push('Laboratory number is required');
    if (!fname || fname.trim() === '') validationErrors.push('First name is required');
    if (!lname || lname.trim() === '') validationErrors.push('Last name is required');
    if (!remarks || remarks.trim() === '') validationErrors.push('Remarks are required');
    
    if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed', 
            details: validationErrors 
        });
    }

    const attachmentPath = req.file?.path || null;
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const sql = `
        INSERT INTO test_endorsement (
            labno, fname, lname, facility_code, facility_name, test_result, 
            remarks, attachment_path, date_endorsed, endorsed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        labno.trim(),
        fname.trim(),
        lname.trim(),
        facility_code?.trim() || null,
        facility_name?.trim() || null,
        test_result?.trim() || null,
        remarks.trim(),
        attachmentPath,
        date_endorsed || currentDate,
        endorsed_by?.trim() || 'System User'
    ];
    
    console.log('SQL Query:', sql);
    console.log('Values:', values);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Database insert error:', err);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Database insert failed', 
                details: err.message 
            });
        }
        
        console.log('Insert successful, ID:', result.insertId);
        
        // Return the complete saved data
        const savedData = {
            id: result.insertId,
            labno: labno.trim(),
            fname: fname.trim(),
            lname: lname.trim(),
            facility_code: facility_code?.trim() || null,
            facility_name: facility_name?.trim() || null,
            test_result: test_result?.trim() || null,
            remarks: remarks.trim(),
            attachment_path: attachmentPath,
            date_endorsed: date_endorsed || currentDate,
            endorsed_by: endorsed_by?.trim() || 'System User'
        };
        
        res.status(201).json({
            success: true,
            id: result.insertId,
            message: 'Endorsement saved successfully',
            data: savedData,
            file: req.file || null
        });
    });
});




// GET endorsement by ID
router.get('/:id', (req, res) => {
    console.log('=== GET ENDORSEMENT BY ID ===', req.params.id);
    
    const sql = `
        SELECT 
            id, labno, fname, lname, facility_code, facility_name, 
            test_result, remarks, attachment_path, date_endorsed, endorsed_by
        FROM test_endorsement 
        WHERE id = ?
    `;
    
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in GET /:id:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found with ID:', req.params.id);
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }
        
        console.log('Found endorsement:', results[0]);
        res.json({ 
            success: true, 
            data: results[0] 
        });
    });
});

// DOWNLOAD attachment
router.get('/download/:id', (req, res) => {
    console.log('=== DOWNLOAD ATTACHMENT ===', req.params.id);
    
    const sql = 'SELECT attachment_path, fname, lname FROM test_endorsement WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in download:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found for download with ID:', req.params.id);
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }

        const { attachment_path, fname, lname } = results[0];
        
        if (!attachment_path || !fs.existsSync(attachment_path)) {
            console.log('File not found:', attachment_path);
            return res.status(404).json({ 
                success: false,
                error: 'Attachment file not found' 
            });
        }

        const filename = `${fname}_${lname}_attachment${path.extname(attachment_path)}`;
        console.log('Downloading file:', attachment_path, 'as:', filename);
        res.download(attachment_path, filename);
    });
});

// UPDATE endorsement
router.put('/:id', upload.single('endorsementFile'), (req, res) => {
    console.log('=== UPDATE ENDORSEMENT ===', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { 
        labno, 
        fname, 
        lname, 
        facility_code, 
        facility_name, 
        test_result, 
        remarks, 
        endorsed_by 
    } = req.body;
    const id = req.params.id;

    // Enhanced validation
    const validationErrors = [];
    if (!labno || labno.trim() === '') validationErrors.push('Laboratory number is required');
    if (!fname || fname.trim() === '') validationErrors.push('First name is required');
    if (!lname || lname.trim() === '') validationErrors.push('Last name is required');
    if (!remarks || remarks.trim() === '') validationErrors.push('Remarks are required');
    
    if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed', 
            details: validationErrors 
        });
    }

    const getSql = 'SELECT attachment_path FROM test_endorsement WHERE id = ?';
    db.query(getSql, [id], (err, results) => {
        if (err) {
            console.error('Database error in UPDATE (get):', err);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found for update with ID:', id);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }

        let attachmentPath = results[0].attachment_path;
        
        // Handle file replacement
        if (req.file) {
            // Delete old file if it exists
            if (attachmentPath && fs.existsSync(attachmentPath)) {
                fs.unlinkSync(attachmentPath);
                console.log('Deleted old attachment:', attachmentPath);
            }
            attachmentPath = req.file.path;
            console.log('New attachment path:', attachmentPath);
        }

        const updateSql = `
            UPDATE test_endorsement 
            SET labno = ?, fname = ?, lname = ?, facility_code = ?, facility_name = ?, 
                test_result = ?, remarks = ?, attachment_path = ?, endorsed_by = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const values = [
            labno.trim(),
            fname.trim(),
            lname.trim(),
            facility_code?.trim() || null,
            facility_name?.trim() || null,
            test_result?.trim() || null,
            remarks.trim(),
            attachmentPath,
            endorsed_by?.trim() || 'System User',
            id
        ];

        console.log('Update SQL:', updateSql);
        console.log('Update values:', values);

        db.query(updateSql, values, (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Database update error:', updateErr);
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                    });
                }
                return res.status(500).json({ 
                    success: false,
                    error: 'Database update failed', 
                    details: updateErr.message 
                });
            }
            
            console.log('Update successful, affected rows:', updateResult.affectedRows);
            res.json({ 
                success: true, 
                message: 'Endorsement updated successfully',
                affectedRows: updateResult.affectedRows
            });
        });
    });
});

// DELETE endorsement
router.delete('/:id', (req, res) => {
    console.log('=== DELETE ENDORSEMENT ===', req.params.id);
    const id = req.params.id;
    
    // First get the file path
    db.query('SELECT attachment_path FROM test_endorsement WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Database error in DELETE (get):', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found for delete with ID:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }

        const attachmentPath = results[0].attachment_path;
        
        // Delete the record
        db.query('DELETE FROM test_endorsement WHERE id = ?', [id], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Database delete error:', deleteErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Database delete failed', 
                    details: deleteErr.message 
                });
            }
            
            console.log('Delete successful, affected rows:', deleteResult.affectedRows);
            
            // Delete the file if it exists
            if (attachmentPath && fs.existsSync(attachmentPath)) {
                fs.unlink(attachmentPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting attachment file:', unlinkErr);
                    else console.log('Deleted attachment file:', attachmentPath);
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Endorsement deleted successfully',
                affectedRows: deleteResult.affectedRows
            });
        });
    });
});

// Enhanced error handler
router.use((err, req, res, next) => {
    console.error('=== ROUTER ERROR ===', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: 'File too large (maximum 10MB allowed)' 
            });
        }
        return res.status(400).json({ 
            success: false,
            error: 'File upload error', 
            details: err.message 
        });
    }
    
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid file type. Only PDF, Images (JPG, PNG, GIF), and Word documents are allowed.' 
        });
    }
    
    return res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: err.message 
    });
});

// VIEW attachment in browser (e.g. PDF or image)
router.get('/view/:id', (req, res) => {
    console.log('=== VIEW ATTACHMENT ===', req.params.id);

    const sql = 'SELECT attachment_path FROM test_endorsement WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in view:', err);
            return res.status(500).json({ success: false, error: 'Database error', details: err.message });
        }

        if (!results.length || !results[0].attachment_path) {
            console.log('No file found for ID:', req.params.id);
            return res.status(404).json({ success: false, error: 'Attachment not found' });
        }

        const attachmentPath = results[0].attachment_path;

        if (!fs.existsSync(attachmentPath)) {
            console.log('File not found on disk:', attachmentPath);
            return res.status(404).json({ success: false, error: 'File not found on server' });
        }

        // Use res.sendFile to let browser preview
        res.sendFile(path.resolve(attachmentPath));
    });
});


module.exports = router;

*/
const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer configuration
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${cleanName}`);
    }
});

const fileFilter = (_, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    cb(allowedTypes.includes(file.mimetype) ? null : new Error('Invalid file type'), allowedTypes.includes(file.mimetype));
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// NOTIFICATION HELPER FUNCTIONS
const NOTIFICATION_TARGET_USERS = [3, 9, 10, 11, 8]; // Users to notify

/**
 * Create notifications for specific users when endorsement is completed
 */
async function createEndorsementNotifications(endorsementData, endorsedBy) {
    console.log('=== CREATING NOTIFICATIONS ===');
    
    const notificationPromises = NOTIFICATION_TARGET_USERS.map(userId => {
        return new Promise((resolve, reject) => {
            const notificationSql = `
                INSERT INTO test_pdo_notifications 
                (user_id, endorsed_by, type, title, message, endorsement_data, is_read, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const title = 'New Endorsement Received';
            const message = `New endorsement for ${endorsementData.fname} ${endorsementData.lname} (Lab No: ${endorsementData.labno}) has been submitted and requires your attention.`;
            const endorsementDataJson = JSON.stringify({
                id: endorsementData.id,
                labno: endorsementData.labno,
                fullName: `${endorsementData.fname} ${endorsementData.lname}`,
                facilityName: endorsementData.facility_name,
                testResult: endorsementData.test_result,
                dateEndorsed: endorsementData.date_endorsed
            });
            
            db.query(notificationSql, [
                userId,
                endorsedBy,
                'endorsement',
                title,
                message,
                endorsementDataJson,
                0 // is_read = false
            ], (err, result) => {
                if (err) {
                    console.error(`Failed to create notification for user ${userId}:`, err);
                    reject(err);
                } else {
                    console.log(`Notification created for user ${userId}, notification_id: ${result.insertId}`);
                    resolve(result.insertId);
                }
            });
        });
    });
    
    try {
        const notificationIds = await Promise.all(notificationPromises);
        console.log(`Successfully created ${notificationIds.length} notifications:`, notificationIds);
        return notificationIds;
    } catch (error) {
        console.error('Error creating some notifications:', error);
        throw error;
    }
}

/**
 * Get unread notifications for a specific user
 */
function getUnreadNotifications(userId, callback) {
    const sql = `
        SELECT 
            n.notification_id,
            n.user_id,
            n.endorsed_by,
            n.type,
            n.title,
            n.message,
            n.endorsement_data,
            n.created_at,
            u.name as endorsed_by_name
        FROM test_pdo_notifications n
        LEFT JOIN user u ON n.endorsed_by = u.username
        WHERE n.user_id = ? AND n.is_read = 0 
        ORDER BY n.created_at DESC
    `;
    
    db.query(sql, [userId], callback);
}

/**
 * Mark notification as read
 */
function markNotificationAsRead(notificationId, callback) {
    const sql = `
        UPDATE test_pdo_notifications 
        SET is_read = 1, read_at = NOW() 
        WHERE notification_id = ?
    `;
    
    db.query(sql, [notificationId], callback);
}

/**
 * Get notification count for a user
 */
function getNotificationCount(userId, callback) {
    const sql = `
        SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_count
        FROM test_pdo_notifications 
        WHERE user_id = ?
    `;
    
    db.query(sql, [userId], callback);
}

// NOTIFICATION API ROUTES

// GET unread notifications for a user
router.get('/notifications/:userId', (req, res) => {
    console.log('=== GET NOTIFICATIONS ===', req.params.userId);
    
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid user ID'
        });
    }
    
    getUnreadNotifications(userId, (err, results) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error',
                details: err.message
            });
        }
        
        // Parse endorsement_data JSON for each notification
        const notifications = results.map(notification => ({
            ...notification,
            endorsement_data: notification.endorsement_data ? 
                JSON.parse(notification.endorsement_data) : null
        }));
        
        res.json({
            success: true,
            data: notifications,
            count: notifications.length
        });
    });
});

// GET notification count for a user
router.get('/notifications/:userId/count', (req, res) => {
    console.log('=== GET NOTIFICATION COUNT ===', req.params.userId);
    
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid user ID'
        });
    }
    
    getNotificationCount(userId, (err, results) => {
        if (err) {
            console.error('Error fetching notification count:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error',
                details: err.message
            });
        }
        
        const counts = results[0] || { total_count: 0, unread_count: 0 };
        res.json({
            success: true,
            data: {
                total: parseInt(counts.total_count),
                unread: parseInt(counts.unread_count)
            }
        });
    });
});

// PUT mark notification as read
router.put('/notifications/:notificationId/read', (req, res) => {
    console.log('=== MARK NOTIFICATION AS READ ===', req.params.notificationId);
    
    const notificationId = parseInt(req.params.notificationId);
    if (isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid notification ID'
        });
    }
    
    markNotificationAsRead(notificationId, (err, result) => {
        if (err) {
            console.error('Error marking notification as read:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error',
                details: err.message
            });
        }
        
        res.json({
            success: true,
            message: 'Notification marked as read',
            affectedRows: result.affectedRows
        });
    });
});

// EXISTING ENDORSEMENT ROUTES (ENHANCED WITH NOTIFICATIONS)

// GET all endorsements
router.get('/', (req, res) => {
    console.log('=== GET ALL ENDORSEMENTS ===');
    const sql = `
        SELECT 
            id, labno, fname, lname, facility_code, facility_name, 
            test_result, remarks, attachment_path, date_endorsed, endorsed_by
        FROM test_endorsement 
        ORDER BY date_endorsed DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error in GET /:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        console.log(`Found ${results.length} endorsements`);
        res.json({ 
            success: true, 
            data: results, 
            count: results.length 
        });
    });
});

// POST new endorsement (ENHANCED WITH NOTIFICATIONS)
router.post('/', upload.single('endorsementFile'), async (req, res) => {
    console.log('=== POST NEW ENDORSEMENT ===');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { 
        labno, 
        fname, 
        lname, 
        facility_code, 
        facility_name, 
        test_result, 
        remarks, 
        date_endorsed, 
        endorsed_by 
    } = req.body;
    
    // Enhanced validation
    const validationErrors = [];
    if (!labno || labno.trim() === '') validationErrors.push('Laboratory number is required');
    if (!fname || fname.trim() === '') validationErrors.push('First name is required');
    if (!lname || lname.trim() === '') validationErrors.push('Last name is required');
    if (!remarks || remarks.trim() === '') validationErrors.push('Remarks are required');
    
    if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed', 
            details: validationErrors 
        });
    }

    const attachmentPath = req.file?.path || null;
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const sql = `
        INSERT INTO test_endorsement (
            labno, fname, lname, facility_code, facility_name, test_result, 
            remarks, attachment_path, date_endorsed, endorsed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        labno.trim(),
        fname.trim(),
        lname.trim(),
        facility_code?.trim() || null,
        facility_name?.trim() || null,
        test_result?.trim() || null,
        remarks.trim(),
        attachmentPath,
        date_endorsed || currentDate,
        endorsed_by?.trim() || 'System User'
    ];
    
    console.log('SQL Query:', sql);
    console.log('Values:', values);

    db.query(sql, values, async (err, result) => {
        if (err) {
            console.error('Database insert error:', err);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Database insert failed', 
                details: err.message 
            });
        }
        
        console.log('Insert successful, ID:', result.insertId);
        
        // Prepare saved data for response and notifications
        const savedData = {
            id: result.insertId,
            labno: labno.trim(),
            fname: fname.trim(),
            lname: lname.trim(),
            facility_code: facility_code?.trim() || null,
            facility_name: facility_name?.trim() || null,
            test_result: test_result?.trim() || null,
            remarks: remarks.trim(),
            attachment_path: attachmentPath,
            date_endorsed: date_endorsed || currentDate,
            endorsed_by: endorsed_by?.trim() || 'System User'
        };
        
        // CREATE NOTIFICATIONS FOR TARGET USERS
        try {
            console.log('Creating notifications for target users...');
            const notificationIds = await createEndorsementNotifications(
                savedData, 
                endorsed_by?.trim() || 'System User'
            );
            
            console.log(`Successfully created ${notificationIds.length} notifications`);
            
            // Return success response with notification info
            res.status(201).json({
                success: true,
                id: result.insertId,
                message: 'Endorsement saved successfully and notifications sent',
                data: savedData,
                file: req.file || null,
                notifications: {
                    created: notificationIds.length,
                    targetUsers: NOTIFICATION_TARGET_USERS,
                    notificationIds: notificationIds
                }
            });
            
        } catch (notificationError) {
            console.error('Error creating notifications:', notificationError);
            
            // Still return success for the endorsement, but mention notification issue
            res.status(201).json({
                success: true,
                id: result.insertId,
                message: 'Endorsement saved successfully, but some notifications may have failed',
                data: savedData,
                file: req.file || null,
                notifications: {
                    error: 'Some notifications failed to send',
                    details: notificationError.message
                }
            });
        }
    });
});

// GET endorsement by ID
router.get('/:id', (req, res) => {
    console.log('=== GET ENDORSEMENT BY ID ===', req.params.id);
    
    const sql = `
        SELECT 
            id, labno, fname, lname, facility_code, facility_name, 
            test_result, remarks, attachment_path, date_endorsed, endorsed_by
        FROM test_endorsement 
        WHERE id = ?
    `;
    
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in GET /:id:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found with ID:', req.params.id);
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }
        
        console.log('Found endorsement:', results[0]);
        res.json({ 
            success: true, 
            data: results[0] 
        });
    });
});

// DOWNLOAD attachment
router.get('/download/:id', (req, res) => {
    console.log('=== DOWNLOAD ATTACHMENT ===', req.params.id);
    
    const sql = 'SELECT attachment_path, fname, lname FROM test_endorsement WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in download:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found for download with ID:', req.params.id);
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }

        const { attachment_path, fname, lname } = results[0];
        
        if (!attachment_path || !fs.existsSync(attachment_path)) {
            console.log('File not found:', attachment_path);
            return res.status(404).json({ 
                success: false,
                error: 'Attachment file not found' 
            });
        }

        const filename = `${fname}_${lname}_attachment${path.extname(attachment_path)}`;
        console.log('Downloading file:', attachment_path, 'as:', filename);
        res.download(attachment_path, filename);
    });
});

// UPDATE endorsement
router.put('/:id', upload.single('endorsementFile'), (req, res) => {
    console.log('=== UPDATE ENDORSEMENT ===', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { 
        labno, 
        fname, 
        lname, 
        facility_code, 
        facility_name, 
        test_result, 
        remarks, 
        endorsed_by 
    } = req.body;
    const id = req.params.id;

    // Enhanced validation
    const validationErrors = [];
    if (!labno || labno.trim() === '') validationErrors.push('Laboratory number is required');
    if (!fname || fname.trim() === '') validationErrors.push('First name is required');
    if (!lname || lname.trim() === '') validationErrors.push('Last name is required');
    if (!remarks || remarks.trim() === '') validationErrors.push('Remarks are required');
    
    if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed', 
            details: validationErrors 
        });
    }

    const getSql = 'SELECT attachment_path FROM test_endorsement WHERE id = ?';
    db.query(getSql, [id], (err, results) => {
        if (err) {
            console.error('Database error in UPDATE (get):', err);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found for update with ID:', id);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }

        let attachmentPath = results[0].attachment_path;
        
        // Handle file replacement
        if (req.file) {
            // Delete old file if it exists
            if (attachmentPath && fs.existsSync(attachmentPath)) {
                fs.unlinkSync(attachmentPath);
                console.log('Deleted old attachment:', attachmentPath);
            }
            attachmentPath = req.file.path;
            console.log('New attachment path:', attachmentPath);
        }

        const updateSql = `
            UPDATE test_endorsement 
            SET labno = ?, fname = ?, lname = ?, facility_code = ?, facility_name = ?, 
                test_result = ?, remarks = ?, attachment_path = ?, endorsed_by = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const values = [
            labno.trim(),
            fname.trim(),
            lname.trim(),
            facility_code?.trim() || null,
            facility_name?.trim() || null,
            test_result?.trim() || null,
            remarks.trim(),
            attachmentPath,
            endorsed_by?.trim() || 'System User',
            id
        ];

        console.log('Update SQL:', updateSql);
        console.log('Update values:', values);

        db.query(updateSql, values, (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Database update error:', updateErr);
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                    });
                }
                return res.status(500).json({ 
                    success: false,
                    error: 'Database update failed', 
                    details: updateErr.message 
                });
            }
            
            console.log('Update successful, affected rows:', updateResult.affectedRows);
            res.json({ 
                success: true, 
                message: 'Endorsement updated successfully',
                affectedRows: updateResult.affectedRows
            });
        });
    });
});

// DELETE endorsement
router.delete('/:id', (req, res) => {
    console.log('=== DELETE ENDORSEMENT ===', req.params.id);
    const id = req.params.id;
    
    // First get the file path
    db.query('SELECT attachment_path FROM test_endorsement WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Database error in DELETE (get):', err);
            return res.status(500).json({ 
                success: false,
                error: 'Database error', 
                details: err.message 
            });
        }
        
        if (!results.length) {
            console.log('No endorsement found for delete with ID:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Endorsement not found' 
            });
        }

        const attachmentPath = results[0].attachment_path;
        
        // Delete the record
        db.query('DELETE FROM test_endorsement WHERE id = ?', [id], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Database delete error:', deleteErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Database delete failed', 
                    details: deleteErr.message 
                });
            }
            
            console.log('Delete successful, affected rows:', deleteResult.affectedRows);
            
            // Delete the file if it exists
            if (attachmentPath && fs.existsSync(attachmentPath)) {
                fs.unlink(attachmentPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting attachment file:', unlinkErr);
                    else console.log('Deleted attachment file:', attachmentPath);
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Endorsement deleted successfully',
                affectedRows: deleteResult.affectedRows
            });
        });
    });
});

// Enhanced error handler
router.use((err, req, res, next) => {
    console.error('=== ROUTER ERROR ===', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: 'File too large (maximum 10MB allowed)' 
            });
        }
        return res.status(400).json({ 
            success: false,
            error: 'File upload error', 
            details: err.message 
        });
    }
    
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid file type. Only PDF, Images (JPG, PNG, GIF), and Word documents are allowed.' 
        });
    }
    
    return res.status(500).json({ 
        success: false,
        error: 'Internal server error', 
        details: err.message 
    });
});

// VIEW attachment in browser (e.g. PDF or image)
router.get('/view/:id', (req, res) => {
    console.log('=== VIEW ATTACHMENT ===', req.params.id);

    const sql = 'SELECT attachment_path FROM test_endorsement WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in view:', err);
            return res.status(500).json({ success: false, error: 'Database error', details: err.message });
        }

        if (!results.length || !results[0].attachment_path) {
            console.log('No file found for ID:', req.params.id);
            return res.status(404).json({ success: false, error: 'Attachment not found' });
        }

        const attachmentPath = results[0].attachment_path;

        if (!fs.existsSync(attachmentPath)) {
            console.log('File not found on disk:', attachmentPath);
            return res.status(404).json({ success: false, error: 'File not found on server' });
        }

        // Use res.sendFile to let browser preview
        res.sendFile(path.resolve(attachmentPath));
    });
});

module.exports = router;