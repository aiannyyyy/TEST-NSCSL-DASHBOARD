const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/generate-report', (req, res) => {
    const { submid, from, to } = req.query;

    // Validate required parameters
    if (!submid || !from || !to) {
        return res.status(400).json({ 
            error: 'Missing required parameters: submid, from, to' 
        });
    }

    console.log(`Generating report for submid: ${submid}, from: ${from}, to: ${to}`);
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
        return res.status(400).json({ 
            error: 'Invalid date format. Use YYYY-MM-DD format.' 
        });
    }

    const exePath = path.join(__dirname, '..', 'CrystalReportExporter', 'CrystalReportExporter.exe');
    const pdfPath = path.join(__dirname, '..', 'CrystalReportExporter', 'Reports', 'nsf_performance.pdf');

    // Check if exe exists
    if (!fs.existsSync(exePath)) {
        console.error(`Executable not found at: ${exePath}`);
        return res.status(500).json({ error: 'Report generator not found' });
    }

    // Remove existing PDF file to avoid confusion
    if (fs.existsSync(pdfPath)) {
        try {
            fs.unlinkSync(pdfPath);
            console.log('Removed existing PDF file');
        } catch (err) {
            console.warn('Could not remove existing PDF:', err.message);
        }
    }

    // Execute the Crystal Report generator
    execFile(exePath, [submid, from, to], { timeout: 30000 }, (error, stdout, stderr) => {
        console.log('VB.NET Output:', stdout);
        if (stderr) console.log('VB.NET Stderr:', stderr);

        if (error) {
            console.error(`Execution error: ${error.message}`);
            return res.status(500).json({ 
                error: 'Error generating report', 
                details: error.message 
            });
        }

        // Check if the PDF was actually created
        fs.access(pdfPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error(`PDF file not found at: ${pdfPath}`);
                return res.status(500).json({ 
                    error: 'Report file not generated',
                    path: pdfPath 
                });
            }

            console.log(`PDF found at: ${pdfPath}`);

            // Set proper headers for PDF display
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename=nsf_performance.pdf');
            res.setHeader('Cache-Control', 'no-cache');

            // Stream the PDF file
            const fileStream = fs.createReadStream(pdfPath);
            
            fileStream.on('error', (streamError) => {
                console.error('Stream error:', streamError);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error reading PDF file' });
                }
            });

            fileStream.pipe(res);
        });
    });
});

module.exports = router;