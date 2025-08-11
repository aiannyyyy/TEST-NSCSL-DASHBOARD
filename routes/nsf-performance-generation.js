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

    // FIX 1: Use the correct executable name as found in health check
    const exePath = path.join(__dirname, '..', 'CrystalReportExporter', 'CrystalReportExporter.exe');
    
    // Generate the expected PDF filename based on your VB.NET code
    const fromFormatted = from.replace(/-/g, ''); // 2025-07-01 -> 20250701
    const toFormatted = to.replace(/-/g, '');     // 2025-07-25 -> 20250725
    const expectedPdfName = `nsf_performance_${submid}_${fromFormatted}_${toFormatted}.pdf`;
    const pdfPath = path.join(__dirname, '..', 'CrystalReportExporter', 'Reports', expectedPdfName);

    console.log(`Executable path: ${exePath}`);
    console.log(`Expected PDF path: ${pdfPath}`);

    // Check if exe exists
    if (!fs.existsSync(exePath)) {
        console.error(`Executable not found at: ${exePath}`);
        
        // FIX 2: Try alternative paths based on your actual structure
        const alternativePaths = [
            path.join(__dirname, '..', 'CrystalReportExporter', 'CrystalReportExporter.exe'),
            path.join(__dirname, '..', 'CrystalReportExporter', 'bin', 'Release', 'CrystalReportExporter.exe'),
            path.join(__dirname, '..', 'CrystalReportExporter', 'bin', 'Debug', 'CrystalReportExporter.exe'),
            path.join(__dirname, '..', 'GenerateReport.exe')
        ];
        
        console.log('Trying alternative paths:');
        let foundPath = null;
        for (const altPath of alternativePaths) {
            console.log(`  Checking: ${altPath} - ${fs.existsSync(altPath) ? 'EXISTS' : 'NOT FOUND'}`);
            if (fs.existsSync(altPath) && !foundPath) {
                foundPath = altPath;
            }
        }
        
        if (foundPath) {
            console.log(`Using alternative path: ${foundPath}`);
            // Update exePath to the found path
            const exePathToUse = foundPath;
            executeReport(exePathToUse, submid, from, to, pdfPath, expectedPdfName, res);
        } else {
            return res.status(500).json({ 
                error: 'Report generator executable not found',
                searchedPaths: [exePath, ...alternativePaths]
            });
        }
    } else {
        executeReport(exePath, submid, from, to, pdfPath, expectedPdfName, res);
    }
});

// FIX 3: Extract execution logic into separate function for reuse
function executeReport(exePath, submid, from, to, pdfPath, expectedPdfName, res) {
    // Remove existing PDF file to avoid confusion
    if (fs.existsSync(pdfPath)) {
        try {
            fs.unlinkSync(pdfPath);
            console.log('Removed existing PDF file');
        } catch (err) {
            console.warn('Could not remove existing PDF:', err.message);
        }
    }

    // FIX 4: Add better error handling and logging
    console.log(`Executing: ${exePath} with args: [${submid}, ${from}, ${to}]`);

    // Execute the Crystal Report generator
    execFile(exePath, [submid, from, to], { 
        timeout: 120000, // FIX 5: Increased timeout to 2 minutes
        cwd: path.dirname(exePath), // Set working directory
        maxBuffer: 1024 * 1024 // 1MB buffer for output
    }, (error, stdout, stderr) => {
        console.log('=== VB.NET EXECUTION RESULTS ===');
        console.log('STDOUT:', stdout);
        if (stderr) console.log('STDERR:', stderr);
        console.log('================================');

        if (error) {
            console.error(`Execution error: ${error.message}`);
            console.error(`Error code: ${error.code}`);
            console.error(`Error signal: ${error.signal}`);
            
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
                code: error.code,
                stdout: stdout,
                stderr: stderr
            });
        }

        // FIX 6: Wait a bit before checking for file (sometimes file creation is delayed)
        setTimeout(() => {
            checkAndServeFile(pdfPath, expectedPdfName, stdout, stderr, res);
        }, 1000); // Wait 1 second
    });
}

// FIX 7: Extract file checking and serving logic
function checkAndServeFile(pdfPath, expectedPdfName, stdout, stderr, res) {
    // Check if the PDF was actually created
    fs.access(pdfPath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`PDF file not found at: ${pdfPath}`);
            
            // Try to find any PDF files in the Reports directory for debugging
            const reportsDir = path.dirname(pdfPath);
            try {
                if (fs.existsSync(reportsDir)) {
                    const files = fs.readdirSync(reportsDir);
                    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
                    console.log('Available PDF files in Reports directory:', pdfFiles);
                    
                    // FIX 8: If we find a similar PDF file, suggest it
                    const similarFiles = pdfFiles.filter(file => file.includes(expectedPdfName.split('_')[1])); // Match by submid
                    if (similarFiles.length > 0) {
                        console.log('Found similar files that might be the result:', similarFiles);
                    }
                } else {
                    console.error('Reports directory does not exist:', reportsDir);
                }
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
                
                // FIX 9: Check if file is too small (might indicate empty report)
                if (stats.size < 1000) {
                    console.warn('Warning: PDF file is very small, might be empty or corrupted');
                }
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
}

// FIX 10: Enhanced health check endpoint
router.get('/health', (req, res) => {
    const possibleExePaths = [
        path.join(__dirname, '..', 'CrystalReportExporter', 'CrystalReportExporter.exe'),
        path.join(__dirname, '..', 'CrystalReportExporter', 'bin', 'Release', 'CrystalReportExporter.exe'),
        path.join(__dirname, '..', 'CrystalReportExporter', 'bin', 'Debug', 'CrystalReportExporter.exe')
    ];
    
    const reportsDir = path.join(__dirname, '..', 'CrystalReportExporter', 'Reports');
    
    let foundExe = null;
    const exeStatus = {};
    
    for (const exePath of possibleExePaths) {
        const exists = fs.existsSync(exePath);
        exeStatus[path.basename(exePath)] = {
            path: exePath,
            exists: exists
        };
        if (exists && !foundExe) {
            foundExe = exePath;
        }
    }
    
    const health = {
        status: foundExe ? 'ok' : 'error',
        foundExecutable: foundExe,
        executableStatus: exeStatus,
        reportsDirectoryExists: fs.existsSync(reportsDir),
        reportsDirectoryPath: reportsDir,
        timestamp: new Date().toISOString()
    };
    
    if (!foundExe || !health.reportsDirectoryExists) {
        health.status = 'error';
        return res.status(500).json(health);
    }
    
    res.json(health);
});

// FIX 11: Add a test endpoint to manually test VB.NET execution
router.get('/test-exe', (req, res) => {
    const { submid = '0001', from = '2025-07-01', to = '2025-07-25' } = req.query;
    
    console.log('Testing VB.NET executable with test parameters...');
    
    const possibleExePaths = [
        path.join(__dirname, '..', 'CrystalReportExporter', 'GenerateReport.exe'),
        path.join(__dirname, '..', 'CrystalReportExporter', 'CrystalReportExporter.exe')
    ];
    
    let exePath = null;
    for (const path of possibleExePaths) {
        if (fs.existsSync(path)) {
            exePath = path;
            break;
        }
    }
    
    if (!exePath) {
        return res.status(500).json({ error: 'No executable found' });
    }
    
    console.log(`Testing executable: ${exePath}`);
    
    execFile(exePath, [submid, from, to], { 
        timeout: 30000,
        cwd: path.dirname(exePath)
    }, (error, stdout, stderr) => {
        res.json({
            executable: exePath,
            args: [submid, from, to],
            error: error ? error.message : null,
            stdout: stdout,
            stderr: stderr,
            timestamp: new Date().toISOString()
        });
    });
});

module.exports = router;