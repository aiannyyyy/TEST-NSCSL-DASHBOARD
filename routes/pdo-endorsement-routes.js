const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// GET all endorsements
router.get('/', (req, res) => {
    console.log('Fetching endorsement details...');
    const sql = `
        SELECT * FROM test_endorsement
        ORDER BY date_endorsed DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching endorsement details:', err);
            return res.status(500).json({ success: false, message: 'Database query failed' });
        }

        console.log('Endorsement details fetched successfully');
        res.json({ success: true, data: results, message: 'Endorsement details fetched successfully' });
    });
});

// UPDATE status route - Fixed to handle numeric status values
router.post('/update-status/:id', (req, res) => {
    console.log('=== UPDATE STATUS ===', req.params.id);
    const { id } = req.params;
    const { status } = req.body;

    // Validate and convert status value
    let numericStatus;
    if (status === 'open' || status === 'Open' || status === 1 || status === '1') {
        numericStatus = 1;
    } else if (status === 'closed' || status === 'Closed' || status === 0 || status === '0') {
        numericStatus = 0;
    } else {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be "open" or "closed"'
        });
    }

    // First, check if the record exists
    const checkSql = 'SELECT id, labno, fname, lname, status FROM test_endorsement WHERE id = ?';
    db.query(checkSql, [id], (err, results) => {
        if (err) {
            console.error('Database error in status check:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                details: err.message
            });
        }

        if (!results.length) {
            console.log('No endorsement found with ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Endorsement not found'
            });
        }

        const endorsement = results[0];
        const currentStatus = endorsement.status;

        // Check if status is already the same
        if (currentStatus === numericStatus) {
            const statusText = numericStatus === 1 ? 'open' : 'closed';
            return res.json({
                success: true,
                message: `Status is already ${statusText}`,
                data: endorsement
            });
        }

        // Update the status - ONLY updating the status column
        const updateSql = `
            UPDATE test_endorsement 
            SET status = ?
            WHERE id = ?
        `;

        db.query(updateSql, [numericStatus, id], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Database error in status update:', updateErr);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update status',
                    details: updateErr.message
                });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No record updated'
                });
            }

            const oldStatusText = currentStatus === 1 ? 'open' : 'closed';
            const newStatusText = numericStatus === 1 ? 'open' : 'closed';

            console.log(`Status updated successfully for ID ${id}: ${oldStatusText} -> ${newStatusText}`);

            res.json({
                success: true,
                message: `Case ${endorsement.labno} status updated to ${newStatusText}`,
                data: {
                    id: endorsement.id,
                    labno: endorsement.labno,
                    patient_name: `${endorsement.fname} ${endorsement.lname}`,
                    old_status: oldStatusText,
                    new_status: newStatusText
                }
            });
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
            return res.status(500).json({ success: false, error: 'Database error', details: err.message });
        }

        if (!results.length) {
            console.log('No endorsement found for download with ID:', req.params.id);
            return res.status(404).json({ success: false, error: 'Endorsement not found' });
        }

        const { attachment_path, fname, lname } = results[0];
        const resolvedPath = path.resolve(uploadDir, attachment_path);

        // Prevent path traversal
        if (!resolvedPath.startsWith(uploadDir)) {
            console.warn('Attempted path traversal:', resolvedPath);
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        if (!fs.existsSync(resolvedPath)) {
            console.log('File not found:', resolvedPath);
            return res.status(404).json({ success: false, error: 'Attachment file not found' });
        }

        const filename = `${fname}_${lname}_attachment${path.extname(resolvedPath)}`;
        console.log('Downloading file:', resolvedPath, 'as:', filename);
        res.download(resolvedPath, filename);
    });
});

// VIEW attachment in browser
router.get('/view/:id', (req, res) => {
    console.log('=== VIEW ATTACHMENT ===', req.params.id);

    const sql = 'SELECT attachment_path FROM test_endorsement WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Database error in view:', err);
            return res.status(500).json({ success: false, error: 'Database error', details: err.message });
        }

        if (!results.length || !results[0].attachment_path) {
            console.log('No attachment path found for ID:', req.params.id);
            return res.status(404).json({ success: false, error: 'Attachment not found' });
        }

        const resolvedPath = path.resolve(uploadDir, results[0].attachment_path);

        // Prevent path traversal
        if (!resolvedPath.startsWith(uploadDir)) {
            console.warn('Attempted path traversal:', resolvedPath);
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        if (!fs.existsSync(resolvedPath)) {
            console.log('File not found on disk:', resolvedPath);
            return res.status(404).json({ success: false, error: 'File not found on server' });
        }

        res.sendFile(resolvedPath);
    });
});

module.exports = router;
