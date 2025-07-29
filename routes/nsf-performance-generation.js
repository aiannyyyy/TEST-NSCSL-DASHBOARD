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
    
    // Generate the expected PDF filename based on your VB.NET code
    const fromFormatted = from.replace(/-/g, ''); // 2025-07-01 -> 20250701
    const toFormatted = to.replace(/-/g, '');     // 2025-07-25 -> 20250725
    const expectedPdfName = `nsf_performance_${submid}_${fromFormatted}_${toFormatted}.pdf`;
    const pdfPath = path.join(__dirname, '..', 'CrystalReportExporter', 'Reports', expectedPdfName);

    console.log(`Expected PDF path: ${pdfPath}`);

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
    execFile(exePath, [submid, from, to], { 
        timeout: 60000, // Increased timeout to 60 seconds
        cwd: path.dirname(exePath) // Set working directory
    }, (error, stdout, stderr) => {
        console.log('VB.NET Output:', stdout);
        if (stderr) console.log('VB.NET Stderr:', stderr);

        if (error) {
            console.error(`Execution error: ${error.message}`);
            
            // Provide more detailed error information
            let errorMessage = 'Error generating report';
            if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Report generation timed out. Please try again.';
            } else if (error.code === 'ENOENT') {
                errorMessage = 'Report generator executable not found.';
            }
            
            return res.status(500).json({ 
                error: errorMessage, 
                details: error.message,
                stdout: stdout,
                stderr: stderr
            });
        }

        // Check if the PDF was actually created
        fs.access(pdfPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error(`PDF file not found at: ${pdfPath}`);
                
                // Try to find any PDF files in the Reports directory for debugging
                const reportsDir = path.join(__dirname, '..', 'CrystalReportExporter', 'Reports');
                try {
                    const files = fs.readdirSync(reportsDir);
                    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
                    console.log('Available PDF files in Reports directory:', pdfFiles);
                } catch (dirError) {
                    console.error('Could not read Reports directory:', dirError.message);
                }
                
                return res.status(500).json({ 
                    error: 'Report file not generated',
                    expectedPath: pdfPath,
                    stdout: stdout,
                    stderr: stderr
                });
            }

            console.log(`PDF found at: ${pdfPath}`);

            // Get file stats for additional info
            fs.stat(pdfPath, (statErr, stats) => {
                if (statErr) {
                    console.warn('Could not get file stats:', statErr.message);
                } else {
                    console.log(`PDF file size: ${stats.size} bytes`);
                }

                // Set proper headers for PDF display
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${expectedPdfName}"`);
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                // Stream the PDF file
                const fileStream = fs.createReadStream(pdfPath);
                
                fileStream.on('error', (streamError) => {
                    console.error('Stream error:', streamError);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Error reading PDF file' });
                    }
                });

                fileStream.on('end', () => {
                    console.log('PDF file streamed successfully');
                });

                fileStream.pipe(res);
            });
        });
    });
});

// Optional: Add a health check endpoint
router.get('/health', (req, res) => {
    const exePath = path.join(__dirname, '..', 'CrystalReportExporter', 'CrystalReportExporter.exe');
    const reportsDir = path.join(__dirname, '..', 'CrystalReportExporter', 'Reports');
    
    const health = {
        status: 'ok',
        exeExists: fs.existsSync(exePath),
        reportsDirectoryExists: fs.existsSync(reportsDir),
        timestamp: new Date().toISOString()
    };
    
    if (!health.exeExists || !health.reportsDirectoryExists) {
        health.status = 'error';
        return res.status(500).json(health);
    }
    
    res.json(health);
});

module.exports = router;