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
// GET: All notifications for a user
// ========================
router.get('/:userId', async (req, res) => {
    const userId = String(req.params.userId); // Ensure consistent type for comparison

    // Basic input check
    if (!userId || userId.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing user ID'
        });
    }

    try {
        console.log(`🔍 Fetching notifications for user_id: "${userId}"`);

        const [rows] = await db.execute(
            `SELECT * FROM test_pdo_notifications 
             WHERE CAST(user_id AS CHAR) = ? 
             ORDER BY created_at DESC`,
            [userId]
        );

        console.log(`✅ Found ${rows.length} notification(s) for user_id: ${userId}`);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (err) {
        // Print entire error object for debugging
        console.error('❌ Error fetching notifications:', err);

        // Respond with full details (temporarily while debugging)
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: err.message,
            stack: err.stack
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