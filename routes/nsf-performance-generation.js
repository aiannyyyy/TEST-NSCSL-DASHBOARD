const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// IMPROVEMENT: Add request logging middleware
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, req.query);
    next();
});

// IMPROVEMENT: Configuration object for better maintainability
const CONFIG = {
    TIMEOUT: 120000, // 2 minutes
    MAX_BUFFER: 1024 * 1024 * 5, // 5MB buffer
    FILE_CHECK_DELAY: 1500, // Wait time before checking for generated file
    MIN_PDF_SIZE: 1000, // Minimum expected PDF size
    POSSIBLE_EXE_NAMES: [
        'GenerateReport.exe', // From your VB.NET code
        'CrystalReportExporter.exe',
        'NSFReportGenerator.exe'
    ]
};

router.get('/generate-report', async (req, res) => {
    const { submid, from, to } = req.query;
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] Starting report generation request`);

    // Validate required parameters
    if (!submid || !from || !to) {
        console.log(`[${requestId}] Missing parameters:`, { submid, from, to });
        return res.status(400).json({ 
            error: 'Missing required parameters: submid, from, to',
            requestId: requestId
        });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
        console.log(`[${requestId}] Invalid date format:`, { from, to });
        return res.status(400).json({ 
            error: 'Invalid date format. Use YYYY-MM-DD format.',
            requestId: requestId
        });
    }

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
        console.log(`[${requestId}] Invalid date range:`, { from, to });
        return res.status(400).json({ 
            error: 'Start date cannot be after end date.',
            requestId: requestId
        });
    }

    try {
        // Find executable
        const exePath = await findExecutable();
        if (!exePath) {
            console.error(`[${requestId}] No executable found`);
            return res.status(500).json({ 
                error: 'Report generator executable not found',
                searchedPaths: await getAllPossiblePaths(),
                requestId: requestId
            });
        }

        console.log(`[${requestId}] Using executable: ${exePath}`);

        // Generate expected PDF path
        const pdfInfo = generatePdfInfo(submid, from, to, exePath);
        console.log(`[${requestId}] Expected PDF: ${pdfInfo.fileName}`);

        // Clean up existing file
        await cleanupExistingFile(pdfInfo.fullPath, requestId);

        // Execute report generation - FIXED: Pass res object properly
        await executeReportGeneration(exePath, submid, from, to, pdfInfo, requestId, res);

    } catch (error) {
        console.error(`[${requestId}] Unexpected error:`, error);
        // Only send response if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message,
                requestId: requestId
            });
        }
    }
});

// IMPROVEMENT: Async function to find executable
async function findExecutable() {
    const possiblePaths = await getAllPossiblePaths();
    
    for (const exePath of possiblePaths) {
        if (fs.existsSync(exePath)) {
            return exePath;
        }
    }
    return null;
}

// IMPROVEMENT: Get all possible executable paths
async function getAllPossiblePaths() {
    const baseDirs = [
        path.join(__dirname, '..', 'CrystalReportExporter'),
        path.join(__dirname, '..', 'CrystalReportExporter', 'bin', 'Release'),
        path.join(__dirname, '..', 'CrystalReportExporter', 'bin', 'Debug'),
        path.join(__dirname, '..'),
        process.cwd()
    ];

    const paths = [];
    for (const dir of baseDirs) {
        for (const exeName of CONFIG.POSSIBLE_EXE_NAMES) {
            paths.push(path.join(dir, exeName));
        }
    }
    return paths;
}

// IMPROVEMENT: Generate PDF file information
function generatePdfInfo(submid, from, to, exePath) {
    const fromFormatted = from.replace(/-/g, '');
    const toFormatted = to.replace(/-/g, '');
    const fileName = `nsf_performance_${submid}_${fromFormatted}_${toFormatted}.pdf`;
    const reportsDir = path.join(path.dirname(exePath), 'Reports');
    const fullPath = path.join(reportsDir, fileName);
    
    return { fileName, fullPath, reportsDir };
}

// IMPROVEMENT: Clean up existing files
async function cleanupExistingFile(filePath, requestId) {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`[${requestId}] Cleaned up existing PDF file`);
        } catch (err) {
            console.warn(`[${requestId}] Could not remove existing PDF:`, err.message);
        }
    }
}

// FIXED: Execute report generation with better waiting strategy
async function executeReportGeneration(exePath, submid, from, to, pdfInfo, requestId, res) {
    return new Promise((resolve, reject) => {
        console.log(`[${requestId}] Executing: ${path.basename(exePath)} [${submid}, ${from}, ${to}]`);

        const startTime = Date.now();
        let responseHandled = false; // Flag to prevent multiple responses

        const child = execFile(exePath, [submid, from, to], { 
            timeout: CONFIG.TIMEOUT,
            cwd: path.dirname(exePath),
            maxBuffer: CONFIG.MAX_BUFFER
        }, async (error, stdout, stderr) => {
            if (responseHandled) {
                console.log(`[${requestId}] Response already handled, skipping callback`);
                return;
            }

            const duration = Date.now() - startTime;
            console.log(`[${requestId}] Execution completed in ${duration}ms`);
            console.log(`[${requestId}] STDOUT:`, stdout);
            if (stderr) console.log(`[${requestId}] STDERR:`, stderr);

            responseHandled = true;

            if (error && error.code !== 0) {
                console.error(`[${requestId}] Execution error:`, error.message);
                
                if (!res.headersSent) {
                    const errorResponse = {
                        error: getErrorMessage(error),
                        details: {
                            code: error.code,
                            signal: error.signal,
                            stdout: stdout || '',
                            stderr: stderr || '',
                            duration: duration
                        },
                        requestId: requestId
                    };
                    
                    res.status(500).json(errorResponse);
                }
                return reject(error);
            }

            // Process completed successfully - now look for ANY generated PDF
            console.log(`[${requestId}] Process completed successfully, searching for generated PDFs...`);
            
            try {
                await findAndServeGeneratedPDF(pdfInfo, submid, from, to, stdout, stderr, requestId, res);
                resolve();
            } catch (err) {
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Error processing generated file',
                        details: err.message,
                        requestId: requestId
                    });
                }
                reject(err);
            }
        });

        // Handle process events
        child.on('spawn', () => {
            console.log(`[${requestId}] Process spawned successfully`);
        });

        child.on('error', (err) => {
            console.error(`[${requestId}] Process error:`, err);
            if (!responseHandled && !res.headersSent) {
                responseHandled = true;
                res.status(500).json({
                    error: 'Process execution failed',
                    details: err.message,
                    requestId: requestId
                });
                reject(err);
            }
        });
    });
}

// IMPROVEMENT: Better error message generation
function getErrorMessage(error) {
    switch (error.code) {
        case 'ETIMEDOUT':
            return 'Report generation timed out. The process is taking longer than expected.';
        case 'ENOENT':
            return 'Report generator executable not found or not accessible.';
        case 'EACCES':
            return 'Permission denied when trying to execute report generator.';
        default:
            return 'Error generating report. Please check the logs for details.';
    }
}

// NEW: Smart function to find and serve any generated PDF
async function findAndServeGeneratedPDF(pdfInfo, submid, from, to, stdout, stderr, requestId, res) {
    console.log(`[${requestId}] Smart PDF detection - looking for any generated report...`);
    
    // Step 1: Check if main report was generated
    if (fs.existsSync(pdfInfo.fullPath)) {
        console.log(`[${requestId}] Main report found: ${pdfInfo.fileName}`);
        return await serveExistingFile(pdfInfo.fullPath, pdfInfo.fileName, requestId, res, false);
    }

    // Step 2: Get all available PDFs and find the best match
    const alternatives = await findAlternativeFiles(pdfInfo.reportsDir, requestId, submid, from, to);
    
    if (alternatives.length === 0) {
        throw new Error('No PDF files generated');
    }

    // Step 3: Find the most recently generated file that matches our criteria
    const dateFrom = from.replace(/-/g, '');
    const dateTo = to.replace(/-/g, '');
    
    // Look for exact matches first
    const exactMatches = alternatives.filter(alt => {
        const fileName = alt.name.toLowerCase();
        return (
            fileName.includes(`_${submid}_`) &&
            fileName.includes(`_${dateFrom}_`) &&
            fileName.includes(`_${dateTo}.pdf`)
        );
    });

    if (exactMatches.length > 0) {
        // Sort by modification time and take the most recent
        exactMatches.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        const bestMatch = exactMatches[0];
        
        const isTestReport = bestMatch.name.toLowerCase().startsWith('test_');
        console.log(`[${requestId}] Found exact match: ${bestMatch.name} (${isTestReport ? 'test report' : 'main report'})`);
        
        const filePath = path.join(pdfInfo.reportsDir, bestMatch.name);
        return await serveExistingFile(filePath, bestMatch.name, requestId, res, isTestReport);
    }

    // Step 4: If no exact match, take the most recent PDF (fallback)
    const mostRecent = alternatives[0]; // Already sorted by newest first
    const isTestReport = mostRecent.name.toLowerCase().startsWith('test_');
    
    console.log(`[${requestId}] Using most recent PDF as fallback: ${mostRecent.name}`);
    const filePath = path.join(pdfInfo.reportsDir, mostRecent.name);
    return await serveExistingFile(filePath, mostRecent.name, requestId, res, isTestReport);
}

// NEW: Separate function to serve existing files with test report indication
async function serveExistingFile(filePath, fileName, requestId, res, isTestReport = false) {
    return new Promise((resolve, reject) => {
        if (res.headersSent) {
            console.warn(`[${requestId}] Headers already sent, cannot serve file`);
            return resolve();
        }

        // Get file stats
        fs.stat(filePath, (statErr, stats) => {
            if (statErr) {
                console.error(`[${requestId}] Could not get file stats:`, statErr.message);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Could not access generated report',
                        requestId: requestId
                    });
                }
                return reject(statErr);
            }

            const reportType = isTestReport ? 'test report (fallback)' : 'report';
            console.log(`[${requestId}] PDF found and serving: ${fileName} (${stats.size} bytes) - ${reportType}`);
            
            // Check file size
            if (stats.size < CONFIG.MIN_PDF_SIZE) {
                console.warn(`[${requestId}] Warning: PDF file is very small (${stats.size} bytes)`);
            }

            // Set response headers
            try {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('X-Request-ID', requestId);
                res.setHeader('X-File-Size', stats.size.toString());
                res.setHeader('X-Report-Type', isTestReport ? 'test-fallback' : 'main-report');

                // Stream the file
                const fileStream = fs.createReadStream(filePath);
                
                fileStream.on('error', (streamError) => {
                    console.error(`[${requestId}] Stream error:`, streamError);
                    if (!res.headersSent) {
                        res.status(500).json({ 
                            error: 'Error reading PDF file',
                            requestId: requestId
                        });
                    }
                    reject(streamError);
                });

                fileStream.on('end', () => {
                    console.log(`[${requestId}] PDF streamed successfully (${reportType})`);
                    resolve();
                });

                fileStream.pipe(res);

            } catch (headerError) {
                console.error(`[${requestId}] Error setting headers:`, headerError);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Error preparing PDF response',
                        requestId: requestId
                    });
                }
                reject(headerError);
            }
        });
    });
}

// IMPROVEMENT: Find alternative files with enhanced matching for test reports
async function findAlternativeFiles(reportsDir, requestId, submid = null, from = null, to = null) {
    try {
        if (!fs.existsSync(reportsDir)) {
            console.log(`[${requestId}] Reports directory does not exist: ${reportsDir}`);
            return [];
        }

        const files = fs.readdirSync(reportsDir);
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
        
        const fileInfo = pdfFiles.map(file => {
            const filePath = path.join(reportsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime
            };
        }).sort((a, b) => b.modified - a.modified); // Sort by newest first

        console.log(`[${requestId}] Found ${fileInfo.length} PDF files in Reports directory`);
        
        // If we have submid and dates, prioritize matching files
        if (submid && from && to) {
            const dateFrom = from.replace(/-/g, '');
            const dateTo = to.replace(/-/g, '');
            
            const matchingFiles = fileInfo.filter(file => {
                const fileName = file.name.toLowerCase();
                return (
                    // Test report format
                    fileName.startsWith('test_submid_date_') &&
                    fileName.includes(`_${submid}_`) &&
                    fileName.includes(`_${dateFrom}_`) &&
                    fileName.includes(`_${dateTo}.pdf`)
                ) || (
                    // Main report format  
                    fileName.startsWith('nsf_performance_') &&
                    fileName.includes(`_${submid}_`) &&
                    fileName.includes(`_${dateFrom}_`) &&
                    fileName.includes(`_${dateTo}.pdf`)
                );
            });
            
            if (matchingFiles.length > 0) {
                console.log(`[${requestId}] Found ${matchingFiles.length} matching files for SUBMID ${submid}`);
                return matchingFiles;
            }
        }
        
        return fileInfo;
        
    } catch (error) {
        console.error(`[${requestId}] Could not read Reports directory:`, error.message);
        return [];
    }
}

// IMPROVEMENT: Enhanced health check
router.get('/health', async (req, res) => {
    try {
        const exePath = await findExecutable();
        const allPaths = await getAllPossiblePaths();
        
        const executableStatus = {};
        for (const path of allPaths) {
            const exists = fs.existsSync(path);
            executableStatus[path] = exists;
        }
        
        const reportsDir = exePath ? path.join(path.dirname(exePath), 'Reports') : null;
        const reportsExists = reportsDir ? fs.existsSync(reportsDir) : false;
        
        // Check for recent PDF files
        let recentFiles = [];
        if (reportsExists) {
            try {
                const files = fs.readdirSync(reportsDir);
                const pdfFiles = files.filter(f => f.endsWith('.pdf'));
                recentFiles = pdfFiles.slice(0, 5); // Show last 5 PDF files
            } catch (err) {
                console.warn('Could not read reports directory:', err.message);
            }
        }
        
        const health = {
            status: exePath && reportsExists ? 'ok' : 'error',
            foundExecutable: exePath,
            executableStatus: executableStatus,
            reportsDirectory: {
                path: reportsDir,
                exists: reportsExists,
                recentFiles: recentFiles
            },
            configuration: CONFIG,
            timestamp: new Date().toISOString()
        };
        
        const statusCode = health.status === 'ok' ? 200 : 500;
        res.status(statusCode).json(health);
        
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// IMPROVEMENT: Enhanced test endpoint
router.get('/test-exe', async (req, res) => {
    const { submid = '0001', from = '2025-07-01', to = '2025-07-25' } = req.query;
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] Testing VB.NET executable with parameters:`, { submid, from, to });
    
    try {
        const exePath = await findExecutable();
        if (!exePath) {
            return res.status(500).json({ 
                error: 'No executable found',
                searchedPaths: await getAllPossiblePaths(),
                requestId: requestId
            });
        }
        
        const startTime = Date.now();
        execFile(exePath, [submid, from, to], { 
            timeout: 30000,
            cwd: path.dirname(exePath)
        }, (error, stdout, stderr) => {
            const duration = Date.now() - startTime;
            
            res.json({
                requestId: requestId,
                executable: exePath,
                args: [submid, from, to],
                duration: duration,
                success: !error,
                error: error ? {
                    message: error.message,
                    code: error.code,
                    signal: error.signal
                } : null,
                output: {
                    stdout: stdout || '',
                    stderr: stderr || ''
                },
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        res.status(500).json({
            requestId: requestId,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// IMPROVEMENT: Add file listing endpoint for debugging
router.get('/list-reports', async (req, res) => {
    try {
        const exePath = await findExecutable();
        if (!exePath) {
            return res.status(404).json({ error: 'Executable not found' });
        }
        
        const reportsDir = path.join(path.dirname(exePath), 'Reports');
        
        if (!fs.existsSync(reportsDir)) {
            return res.status(404).json({ 
                error: 'Reports directory not found',
                expectedPath: reportsDir
            });
        }
        
        const files = fs.readdirSync(reportsDir);
        const fileDetails = files
            .filter(file => file.endsWith('.pdf'))
            .map(file => {
                const filePath = path.join(reportsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.modified - a.modified);
        
        res.json({
            reportsDirectory: reportsDir,
            totalFiles: fileDetails.length,
            files: fileDetails,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/serve-report/:filename', async (req, res) => {
    const requestId = generateRequestId();
    const fileName = req.params.filename;
    
    console.log(`[${requestId}] Serving specific report: ${fileName}`);
    
    try {
        // Find executable to locate reports directory
        const exePath = await findExecutable();
        if (!exePath) {
            return res.status(404).json({ 
                error: 'Report system not available',
                requestId: requestId
            });
        }
        
        const reportsDir = path.join(path.dirname(exePath), 'Reports');
        const filePath = path.join(reportsDir, fileName);
        
        // Security check: ensure file is within reports directory
        const resolvedPath = path.resolve(filePath);
        const resolvedReportsDir = path.resolve(reportsDir);
        
        if (!resolvedPath.startsWith(resolvedReportsDir)) {
            console.warn(`[${requestId}] Security violation: path outside reports directory`);
            return res.status(403).json({
                error: 'Access denied',
                requestId: requestId
            });
        }
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.warn(`[${requestId}] File not found: ${filePath}`);
            return res.status(404).json({
                error: 'Report file not found',
                filename: fileName,
                requestId: requestId
            });
        }
        
        // Check if it's a PDF file
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            console.warn(`[${requestId}] Non-PDF file requested: ${fileName}`);
            return res.status(400).json({
                error: 'Only PDF files can be served',
                requestId: requestId
            });
        }
        
        // Serve the file using the new function
        await serveExistingFile(filePath, fileName, requestId, res, false);
        
    } catch (error) {
        console.error(`[${requestId}] Error serving report:`, error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                details: error.message,
                requestId: requestId
            });
        }
    }
});

// ADD this utility function if you don't have it already
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

module.exports = router;