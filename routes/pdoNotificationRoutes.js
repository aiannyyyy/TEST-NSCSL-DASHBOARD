/*
const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnectionPromise'); // Adjust path if needed

// Helper function to handle database response
const handleDbResponse = (result) => {
    if (Array.isArray(result)) {
        return result;
    } else if (result && Array.isArray(result[0])) {
        return result[0];
    } else if (result && result.rows) {
        return result.rows;
    }
    return [];
};

// ========================
// GET: Endorsement details (MOVE THIS TO THE TOP!)
// ========================
router.get('/endorsement_details', async (req, res) => {
    const { endorsed_by } = req.query;

    if (!endorsed_by) {
        return res.status(400).json({
            success: false,
            message: "Missing endorsed_by parameter"
        });
    }

    try {
        const [rows] = await db.execute(
            `SELECT endorsed_by, endorsement_data
             FROM test_pdo_notifications
             WHERE endorsed_by = ?`,
            [endorsed_by]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `No endorsement records found for ${endorsed_by}` 
            });
        }

        const data = rows.map(row => {
            let endorsementData = null;
            try {
                endorsementData = JSON.parse(row.endorsement_data);
            } catch (err) {
                console.error('Error parsing endorsement_data:', err);
            }
            return {
                endorsed_by: row.endorsed_by,
                endorsement_data: endorsementData
            };
        });

        return res.json({ success: true, data });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Database error', 
            error: err.message 
        });
    }
});

// ========================
// GET: All notifications for a user
// ========================
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;

    // 🔧 FIXED: Consistent validation - check if it's a valid number
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing user ID'
        });
    }

    try {
        console.log(`🔍 Fetching notifications for user_id: ${userId}`);

        // 🔧 FIXED: Use consistent integer comparison
        const [rows] = await db.execute(
            `SELECT * FROM test_pdo_notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [parseInt(userId)]
        );

        console.log(`✅ Found ${rows.length} notification(s) for user_id: ${userId}`);
        
        // 🔧 ADDED: Log the user_ids found for debugging
        if (rows.length > 0) {
            const userIds = [...new Set(rows.map(row => row.user_id))];
            console.log(`📋 User IDs in results: ${userIds.join(', ')}`);
        }

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (err) {
        console.error('❌ Error fetching notifications:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// GET: Unread notifications for a user
// ========================
router.get('/:userId/unread', async (req, res) => {
    const userId = req.params.userId;

    // Input validation
    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID provided'
        });
    }

    try {
        const result = await db.execute(
            `SELECT * FROM test_pdo_notifications 
             WHERE user_id = ? AND is_read = 0 
             ORDER BY created_at DESC`,
            [userId]
        );

        const notifications = handleDbResponse(result);
        
        res.json({ 
            success: true, 
            count: notifications.length, 
            data: notifications 
        });
    } catch (err) {
        console.error('❌ Error fetching unread notifications:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching unread notifications', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// GET: Unread notification count for a user
// ========================
router.get('/:userId/unread-count', async (req, res) => {
    const userId = req.params.userId;

    // Input validation
    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID provided'
        });
    }

    try {
        const result = await db.execute(
            `SELECT COUNT(*) as count FROM test_pdo_notifications 
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        const data = handleDbResponse(result);
        const count = data[0]?.count || 0;
        
        res.json({ 
            success: true, 
            count: count
        });
    } catch (err) {
        console.error('❌ Error fetching unread count:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching unread count', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// POST: Create new notification
// ========================
router.post('/', async (req, res) => {
    const { user_id, endorsed_by = 'System', title, message, endorsement_data = {} } = req.body;

    // Input validation
    if (!user_id || !title || !message) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: user_id, title, message'
        });
    }

    if (isNaN(user_id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user_id provided'
        });
    }

    try {
        const result = await db.execute(
            `INSERT INTO test_pdo_notifications 
             (user_id, endorsed_by, title, message, endorsement_data) 
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, endorsed_by, title, message, JSON.stringify(endorsement_data)]
        );

        // Get the inserted notification ID
        const insertId = result.insertId || (result[0] && result[0].insertId);
        
        res.status(201).json({ 
            success: true, 
            message: 'Notification created successfully',
            notification_id: insertId
        });
    } catch (err) {
        console.error('❌ Error creating notification:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating notification', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// PUT: Mark a notification as read
// ========================
router.put('/:notificationId/read', async (req, res) => {
    const notificationId = req.params.notificationId;

    // Input validation
    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid notification ID provided'
        });
    }

    try {
        const result = await db.execute(
            `UPDATE test_pdo_notifications 
             SET is_read = 1, read_at = NOW() 
             WHERE notification_id = ?`,
            [notificationId]
        );

        // Check if any rows were affected
        const affectedRows = result.affectedRows || (result[0] && result[0].affectedRows) || 0;
        
        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({ 
            success: true, 
            message: 'Notification marked as read' 
        });
    } catch (err) {
        console.error('❌ Error updating notification:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating notification', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// PUT: Mark all notifications as read for a user
// ========================
router.put('/:userId/mark-all-read', async (req, res) => {
    const userId = req.params.userId;

    // Input validation
    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID provided'
        });
    }

    try {
        const result = await db.execute(
            `UPDATE test_pdo_notifications 
             SET is_read = 1, read_at = NOW() 
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        const affectedRows = result.affectedRows || (result[0] && result[0].affectedRows) || 0;
        
        res.json({ 
            success: true, 
            message: `${affectedRows} notifications marked as read`,
            count: affectedRows
        });
    } catch (err) {
        console.error('❌ Error marking notifications as read:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error marking notifications as read', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// DELETE: Delete a notification
// ========================
router.delete('/:notificationId', async (req, res) => {
    const notificationId = req.params.notificationId;

    // Input validation
    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid notification ID provided'
        });
    }

    try {
        const result = await db.execute(
            `DELETE FROM test_pdo_notifications 
             WHERE notification_id = ?`,
            [notificationId]
        );

        const affectedRows = result.affectedRows || (result[0] && result[0].affectedRows) || 0;
        
        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({ 
            success: true, 
            message: 'Notification deleted successfully' 
        });
    } catch (err) {
        console.error('❌ Error deleting notification:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting notification', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});


module.exports = router;
*/
const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnectionPromise'); // Adjust path if needed

// Helper function to handle database response
const handleDbResponse = (result) => {
    if (Array.isArray(result)) {
        return result;
    } else if (result && Array.isArray(result[0])) {
        return result[0];
    } else if (result && result.rows) {
        return result.rows;
    }
    return [];
};

// ========================
// GET: Endorsement details (MUST BE BEFORE /:userId route!)
// ========================
router.get('/endorsement_details', async (req, res) => {
    const { endorsed_by, labno, fullName } = req.query;

    if (!endorsed_by) {
        return res.status(400).json({
            success: false,
            message: "Missing endorsed_by parameter"
        });
    }

    try {
        const [rows] = await db.execute(
            `SELECT endorsed_by, endorsement_data
             FROM test_pdo_notifications
             WHERE endorsed_by = ?`,
            [endorsed_by]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `No endorsement records found for ${endorsed_by}` 
            });
        }

        let data = rows.map(row => {
            let endorsementData = null;
            
            // Check if it's already an object (some MySQL drivers auto-parse JSON columns)
            if (typeof row.endorsement_data === 'object' && row.endorsement_data !== null) {
                endorsementData = row.endorsement_data;
            } 
            // Try to parse if it's a string
            else if (typeof row.endorsement_data === 'string') {
                try {
                    endorsementData = JSON.parse(row.endorsement_data);
                } catch (err) {
                    console.warn(`⚠️ Invalid JSON for endorsed_by: ${row.endorsed_by}, value: ${row.endorsement_data}`);
                    // Return null if it's "[object Object]", otherwise return the raw string
                    endorsementData = row.endorsement_data === '[object Object]' ? null : row.endorsement_data;
                }
            }
            
            return {
                endorsed_by: row.endorsed_by,
                endorsement_data: endorsementData
            };
        });

        // 🔧 Filter by labno if provided
        if (labno) {
            data = data.filter(item => {
                if (!item.endorsement_data) return false;
                // Handle both direct labno and nested structure
                return item.endorsement_data.labno === labno || 
                       item.endorsement_data.lab_no === labno ||
                       item.endorsement_data.labNo === labno;
            });
        }

        // 🔧 Filter by fullName if provided (case-insensitive partial match)
        if (fullName) {
            const searchName = fullName.toLowerCase().trim();
            data = data.filter(item => {
                if (!item.endorsement_data) return false;
                const dataFullName = item.endorsement_data.fullName || 
                                    item.endorsement_data.full_name || 
                                    item.endorsement_data.name || '';
                return dataFullName.toLowerCase().includes(searchName);
            });
        }

        if (data.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `No matching records found for the given filters` 
            });
        }

        return res.json({ 
            success: true, 
            count: data.length, 
            filters: { endorsed_by, labno, fullName },
            data 
        });
    } catch (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Database error', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// GET: All notifications for a user
// ========================
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;

    // 🔧 FIXED: Consistent validation - check if it's a valid number
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing user ID'
        });
    }

    try {
        console.log(`🔍 Fetching notifications for user_id: ${userId}`);

        // 🔧 FIXED: Use consistent integer comparison
        const [rows] = await db.execute(
            `SELECT * FROM test_pdo_notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [parseInt(userId)]
        );

        console.log(`✅ Found ${rows.length} notification(s) for user_id: ${userId}`);
        
        // 🔧 ADDED: Log the user_ids found for debugging
        if (rows.length > 0) {
            const userIds = [...new Set(rows.map(row => row.user_id))];
            console.log(`📋 User IDs in results: ${userIds.join(', ')}`);
        }

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (err) {
        console.error('❌ Error fetching notifications:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// GET: Unread notifications for a user
// ========================
router.get('/:userId/unread', async (req, res) => {
    const userId = req.params.userId;

    // Input validation
    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID provided'
        });
    }

    try {
        const result = await db.execute(
            `SELECT * FROM test_pdo_notifications 
             WHERE user_id = ? AND is_read = 0 
             ORDER BY created_at DESC`,
            [userId]
        );

        const notifications = handleDbResponse(result);
        
        res.json({ 
            success: true, 
            count: notifications.length, 
            data: notifications 
        });
    } catch (err) {
        console.error('❌ Error fetching unread notifications:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching unread notifications', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// GET: Unread notification count for a user
// ========================
router.get('/:userId/unread-count', async (req, res) => {
    const userId = req.params.userId;

    // Input validation
    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID provided'
        });
    }

    try {
        const result = await db.execute(
            `SELECT COUNT(*) as count FROM test_pdo_notifications 
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        const data = handleDbResponse(result);
        const count = data[0]?.count || 0;
        
        res.json({ 
            success: true, 
            count: count
        });
    } catch (err) {
        console.error('❌ Error fetching unread count:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching unread count', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// POST: Create new notification
// ========================
router.post('/', async (req, res) => {
    const { user_id, endorsed_by = 'System', title, message, endorsement_data = {} } = req.body;

    // Input validation
    if (!user_id || !title || !message) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: user_id, title, message'
        });
    }

    if (isNaN(user_id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user_id provided'
        });
    }

    try {
        // 🔧 FIX: Properly stringify endorsement_data
        let endorsementDataString;
        
        if (typeof endorsement_data === 'string') {
            // If it's already a string, validate it's valid JSON
            try {
                JSON.parse(endorsement_data);
                endorsementDataString = endorsement_data;
            } catch {
                // If invalid JSON string, wrap it as an object
                endorsementDataString = JSON.stringify({ value: endorsement_data });
            }
        } else if (typeof endorsement_data === 'object' && endorsement_data !== null) {
            // If it's an object, stringify it properly
            endorsementDataString = JSON.stringify(endorsement_data);
        } else {
            // For other types, wrap in an object
            endorsementDataString = JSON.stringify({ value: endorsement_data });
        }

        console.log('📝 Storing endorsement_data:', endorsementDataString);

        const result = await db.execute(
            `INSERT INTO test_pdo_notifications 
             (user_id, endorsed_by, title, message, endorsement_data) 
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, endorsed_by, title, message, endorsementDataString]
        );

        // Get the inserted notification ID
        const insertId = result.insertId || (result[0] && result[0].insertId);
        
        res.status(201).json({ 
            success: true, 
            message: 'Notification created successfully',
            notification_id: insertId
        });
    } catch (err) {
        console.error('❌ Error creating notification:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating notification', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// PUT: Mark a notification as read
// ========================
router.put('/:notificationId/read', async (req, res) => {
    const notificationId = req.params.notificationId;

    // Input validation
    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid notification ID provided'
        });
    }

    try {
        const result = await db.execute(
            `UPDATE test_pdo_notifications 
             SET is_read = 1, read_at = NOW() 
             WHERE notification_id = ?`,
            [notificationId]
        );

        // Check if any rows were affected
        const affectedRows = result.affectedRows || (result[0] && result[0].affectedRows) || 0;
        
        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({ 
            success: true, 
            message: 'Notification marked as read' 
        });
    } catch (err) {
        console.error('❌ Error updating notification:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating notification', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// PUT: Mark all notifications as read for a user
// ========================
router.put('/:userId/mark-all-read', async (req, res) => {
    const userId = req.params.userId;

    // Input validation
    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID provided'
        });
    }

    try {
        const result = await db.execute(
            `UPDATE test_pdo_notifications 
             SET is_read = 1, read_at = NOW() 
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        const affectedRows = result.affectedRows || (result[0] && result[0].affectedRows) || 0;
        
        res.json({ 
            success: true, 
            message: `${affectedRows} notifications marked as read`,
            count: affectedRows
        });
    } catch (err) {
        console.error('❌ Error marking notifications as read:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error marking notifications as read', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========================
// DELETE: Delete a notification
// ========================
router.delete('/:notificationId', async (req, res) => {
    const notificationId = req.params.notificationId;

    // Input validation
    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid notification ID provided'
        });
    }

    try {
        const result = await db.execute(
            `DELETE FROM test_pdo_notifications 
             WHERE notification_id = ?`,
            [notificationId]
        );

        const affectedRows = result.affectedRows || (result[0] && result[0].affectedRows) || 0;
        
        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({ 
            success: true, 
            message: 'Notification deleted successfully' 
        });
    } catch (err) {
        console.error('❌ Error deleting notification:', err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting notification', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

module.exports = router;