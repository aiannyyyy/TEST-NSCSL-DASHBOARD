const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Create router instance
const router = express.Router();

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Enhanced Crystal Reports 8.5 Compatible Route
router.post('/generate-crystal-report', async (req, res) => {
  let outputPath = null;
  let tempBatFile = null;
  
  try {
    // Extract parameters from request body
    const { submid, dateFrom, dateTo } = req.body;
    
    // Comprehensive validation
    if (!submid || submid.trim() === '') {
      return res.status(400).json({ 
        error: 'SUBMID is required and cannot be empty' 
      });
    }
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ 
        error: 'Both dateFrom and dateTo are required' 
      });
    }
    
    // Validate date format and logic
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DDTHH:MM format' 
      });
    }
    
    if (fromDate >= toDate) {
      return res.status(400).json({ 
        error: 'From date must be before to date' 
      });
    }
    
    console.log('Crystal Report 8.5 generation started:', {
      submid: submid.trim(),
      dateFrom,
      dateTo,
      timestamp: new Date().toISOString()
    });
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedSubmid = submid.replace(/[^a-zA-Z0-9]/g, '_');
    const outputFileName = `sample_report_${sanitizedSubmid}_${timestamp}.pdf`;
    
    // Setup paths
    const tempDir = path.join(__dirname, '..', 'temp_reports');
    const reportPath = path.join(__dirname, '..', 'Reports', 'nsf_performance.rpt');
    outputPath = path.join(tempDir, outputFileName);
    
    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('Created temp directory:', tempDir);
    }
    
    // Check if report file exists
    if (!fs.existsSync(reportPath)) {
      console.error('Report file not found:', reportPath);
      return res.status(500).json({ 
        error: 'Report template file not found',
        path: reportPath 
      });
    }
    
    // Database configuration
    const dbConfig = {
      username: process.env.ORACLE_USER || 'user1',
      password: process.env.ORACLE_PASS || 'newborn',
      server: process.env.DB_SERVER || '10.1.1.191:1521/PROD',
      connectionString: process.env.ORACLE_CONN_STRING
    };
    
    // Validate database configuration
    if (!dbConfig.username || !dbConfig.password) {
      console.error('Database credentials not configured');
      return res.status(500).json({ 
        error: 'Database configuration incomplete' 
      });
    }
    
    // Build selection formula for Crystal Reports 8.5
    const selectionFormula = `not ({SAMPLE_DEMOG_ARCHIVE.LABNO} like "???????8*") and {SAMPLE_DEMOG_ARCHIVE.SUBMID} = "${submid.trim()}" and {SAMPLE_DEMOG_ARCHIVE.DTRECV} >= Date(${fromDate.getFullYear()}, ${fromDate.getMonth() + 1}, ${fromDate.getDate()}) and {SAMPLE_DEMOG_ARCHIVE.DTRECV} <= Date(${toDate.getFullYear()}, ${toDate.getMonth() + 1}, ${toDate.getDate()}) and {REF_PROVIDER_ADDRESS.ADRS_TYPE} = "1"`;
    
    console.log('Selection Formula:', selectionFormula);
    
    // Crystal Reports 8.5 executable paths (in order of preference)
    const crPaths = [
      '"C:\\Program Files (x86)\\Seagate Software\\Crystal Reports\\crw32.exe"',
      '"C:\\Program Files\\Seagate Software\\Crystal Reports\\crw32.exe"',
      '"C:\\Program Files (x86)\\Crystal Decisions\\Crystal Reports\\crw32.exe"',
      '"C:\\Program Files\\Crystal Decisions\\Crystal Reports\\crw32.exe"',
      '"C:\\Program Files (x86)\\Business Objects\\Crystal Reports\\crw32.exe"',
      '"C:\\Program Files\\Business Objects\\Crystal Reports\\crw32.exe"'
    ];
    
    // Find the correct executable
    let crystalExePath = null;
    for (const crPath of crPaths) {
      const pathWithoutQuotes = crPath.replace(/"/g, '');
      if (fs.existsSync(pathWithoutQuotes)) {
        crystalExePath = crPath;
        console.log('Found Crystal Reports executable:', crPath);
        break;
      }
    }
    
    if (!crystalExePath) {
      console.error('Crystal Reports 8.5 executable not found');
      return res.status(500).json({ 
        error: 'Crystal Reports 8.5 executable not found',
        suggestion: 'Please ensure Crystal Reports 8.5 is properly installed',
        searchedPaths: crPaths.map(p => p.replace(/"/g, ''))
      });
    }
    
    // Enhanced command generation with multiple approaches
    const commands = await generateCrystalCommands(
      crystalExePath, 
      reportPath, 
      outputPath, 
      dbConfig, 
      selectionFormula
    );
    
    let success = false;
    let lastError = null;
    let commandUsed = null;
    let executionDetails = [];
    
    // Try each command method with enhanced error handling
    for (const cmdObj of commands) {
      if (!cmdObj.available) {
        console.log(`Skipping ${cmdObj.name} - executable not available`);
        continue;
      }
      
      try {
        console.log(`\n🔄 Attempting ${cmdObj.name}...`);
        
        const result = await executeCrystalCommand(cmdObj, outputPath);
        executionDetails.push(result);
        
        if (result.success) {
          console.log(`✅ Success with ${cmdObj.name}: ${outputPath} (${result.fileSize} bytes)`);
          success = true;
          commandUsed = cmdObj.name;
          break;
        } else {
          console.log(`❌ ${cmdObj.name} failed: ${result.error}`);
          lastError = new Error(result.error);
        }
        
      } catch (error) {
        console.log(`❌ ${cmdObj.name} exception:`, error.message);
        lastError = error;
        executionDetails.push({
          method: cmdObj.name,
          success: false,
          error: error.message,
          duration: 0
        });
        
        // Clean up any partial files
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch (cleanupError) {
            console.warn('Cleanup error:', cleanupError.message);
          }
        }
        
        continue; // Try next method
      }
    }
    
    // If all methods failed, try alternative approaches
    if (!success) {
      console.log('\n🔄 Trying alternative approaches...');
      
      // Try VBS script approach (Crystal Reports 8.5 COM automation)
      const vbsResult = await tryVBSAutomation(reportPath, outputPath, dbConfig, selectionFormula);
      if (vbsResult.success) {
        success = true;
        commandUsed = 'VBS COM Automation';
        executionDetails.push(vbsResult);
      }
      
      // Try batch file approach with different parameters
      if (!success) {
        const batchResult = await tryBatchFileApproach(crystalExePath, reportPath, outputPath, dbConfig, selectionFormula);
        if (batchResult.success) {
          success = true;
          commandUsed = 'Batch File Approach';
          executionDetails.push(batchResult);
        }
      }
    }
    
    // Check final result
    if (!success || !fs.existsSync(outputPath)) {
      console.error('All Crystal Reports methods failed');
      
      return res.status(500).json({ 
        error: 'Crystal Reports PDF generation failed',
        details: lastError ? lastError.message : 'All methods failed',
        attempted: commands.map(cmd => ({
          name: cmd.name,
          available: cmd.available
        })),
        executionDetails: executionDetails,
        diagnostics: await generateDiagnostics(crystalExePath, reportPath, dbConfig),
        suggestions: [
          'Check if Crystal Reports 8.5 is properly installed and licensed',
          'Verify database connectivity and credentials',
          'Check report file permissions and accessibility',
          'Try running the application as Administrator',
          'Ensure no Crystal Reports processes are running',
          'Check Windows Event Logs for Crystal Reports errors',
          'Consider using Crystal Reports Developer Edition for better automation support',
          'Verify Oracle client is properly installed and configured'
        ]
      });
    }
    
    const stats = fs.statSync(outputPath);
    console.log(`✅ Crystal Report generated successfully using ${commandUsed}`);
    console.log(`   File: ${outputPath}`);
    console.log(`   Size: ${stats.size} bytes`);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${outputFileName}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Stream the file to response
    const fileStream = fs.createReadStream(outputPath);
    
    fileStream.on('error', (streamError) => {
      console.error('File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Error reading generated report file' 
        });
      }
    });
    
    // Send file and cleanup
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      // Cleanup temporary files after 10 seconds
      setTimeout(() => {
        cleanupTempFiles([outputPath, tempBatFile]);
      }, 10000);
    });
    
  } catch (error) {
    console.error('Crystal Report generation error:', error);
    
    // Emergency cleanup
    cleanupTempFiles([outputPath, tempBatFile]);
    
    // Return appropriate error
    let errorMessage = 'Crystal Report generation failed';
    let statusCode = 500;
    
    if (error.code === 'ENOENT') {
      errorMessage = 'Crystal Reports executable not found';
      statusCode = 500;
    } else if (error.killed) {
      errorMessage = 'Report generation timed out - try a smaller date range';
      statusCode = 408;
    }
    
    if (!res.headersSent) {
      res.status(statusCode).json({ 
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Enhanced command generation function
async function generateCrystalCommands(crystalExePath, reportPath, outputPath, dbConfig, selectionFormula) {
  const crpePath = crystalExePath.replace('crw32.exe', 'crpe32.exe');
  
  return [
    // Method 1: CRPE32 (Print Engine) - Best for automation
    {
      name: 'CRPE32 (Print Engine)',
      available: fs.existsSync(crpePath.replace(/"/g, '')),
      cmd: [
        crpePath,
        `/report:"${reportPath}"`,
        `/export`,
        `/format:pdf`,
        `/destination:"${outputPath}"`,
        `/user:${dbConfig.username}`,
        `/password:${dbConfig.password}`,
        `/server:${dbConfig.server}`,
        `/formula:"${selectionFormula}"`,
        '/silent',
        '/close'
      ].join(' ')
    },
    
    // Method 2: CRW32 with Crystal Reports 8.5 specific parameters
    {
      name: 'CRW32 Export Mode',
      available: true,
      cmd: [
        crystalExePath,
        `"${reportPath}"`,
        '/E', // Export mode
        '/F:PDF', // Format PDF
        `/O:"${outputPath}"`, // Output file
        `/U:${dbConfig.username}`, // Username
        `/P:${dbConfig.password}`, // Password
        `/S:${dbConfig.server}`, // Server
        '/N', // No splash screen
        '/X' // Exit after export
      ].join(' ')
    },
    
    // Method 3: CRW32 Print to File mode
    {
      name: 'CRW32 Print Mode',
      available: true,
      cmd: [
        crystalExePath,
        `"${reportPath}"`,
        `/PT:"Acrobat PDFWriter","","${outputPath}"`,
        `/U:${dbConfig.username}`,
        `/P:${dbConfig.password}`,
        `/S:${dbConfig.server}`,
        '/A', // Auto close
        '/N' // No splash
      ].join(' ')
    },
    
    // Method 4: Alternative export syntax
    {
      name: 'CRW32 Alternative Export',
      available: true,
      cmd: [
        crystalExePath,
        `/print:"${reportPath}"`,
        '/export:pdf',
        `/file:"${outputPath}"`,
        `/uid:"${dbConfig.username}"`,
        `/pwd:"${dbConfig.password}"`,
        `/dsn:"${dbConfig.server}"`,
        '/minimize',
        '/close'
      ].join(' ')
    }
  ];
}

// Enhanced command execution with better error handling
async function executeCrystalCommand(cmdObj, outputPath) {
  const startTime = Date.now();
  
  try {
    // Hide credentials in log
    const logCmd = cmdObj.cmd
      .replace(/\/password:[^\s]+/g, '/password:***')
      .replace(/\/pwd:"[^"]*"/g, '/pwd:"***"')
      .replace(/\/P:[^\s]+/g, '/P:***');
    console.log('Command:', logCmd);
    
    // Execute with extended timeout and proper Windows handling
    const { stdout, stderr } = await execAsync(cmdObj.cmd, { 
      timeout: 120000, // 2 minutes
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      windowsHide: true,
      env: { ...process.env, TEMP: path.dirname(outputPath) }
    });
    
    const duration = Date.now() - startTime;
    
    // Log outputs if available
    if (stdout && stdout.trim()) console.log(`${cmdObj.name} stdout:`, stdout.trim());
    if (stderr && stderr.trim()) console.log(`${cmdObj.name} stderr:`, stderr.trim());
    
    // Wait for file system to catch up
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if PDF was created successfully
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) { // At least 1KB
        return {
          method: cmdObj.name,
          success: true,
          fileSize: stats.size,
          duration: duration,
          stdout: stdout?.trim() || '',
          stderr: stderr?.trim() || ''
        };
      } else {
        // Delete invalid file
        fs.unlinkSync(outputPath);
        return {
          method: cmdObj.name,
          success: false,
          error: `File created but too small (${stats.size} bytes)`,
          duration: duration
        };
      }
    } else {
      return {
        method: cmdObj.name,
        success: false,
        error: 'No output file created',
        duration: duration,
        stdout: stdout?.trim() || '',
        stderr: stderr?.trim() || ''
      };
    }
    
  } catch (error) {
    return {
      method: cmdObj.name,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      code: error.code
    };
  }
}

// VBS COM Automation approach for Crystal Reports 8.5
async function tryVBSAutomation(reportPath, outputPath, dbConfig, selectionFormula) {
  const vbsPath = path.join(path.dirname(outputPath), `cr_automation_${Date.now()}.vbs`);
  
  try {
    const vbsScript = `
On Error Resume Next

' Create Crystal Reports Application object
Set crApp = CreateObject("CrystalReports.Application")
If Err.Number <> 0 Then
    WScript.Echo "Error: Cannot create Crystal Reports Application object"
    WScript.Quit 1
End If

' Open the report
Set crReport = crApp.OpenReport("${reportPath.replace(/\\/g, '\\\\')}")
If Err.Number <> 0 Then
    WScript.Echo "Error: Cannot open report file"
    WScript.Quit 1
End If

' Set database logon information
crReport.Database.Tables(1).SetLogOnInfo "${dbConfig.server}", "", "${dbConfig.username}", "${dbConfig.password}"

' Set selection formula
crReport.SelectionFormula = "${selectionFormula.replace(/"/g, '""')}"

' Export to PDF
crReport.ExportOptions.FormatType = 31 ' PDF format
crReport.ExportOptions.DestinationType = 1 ' Disk file
crReport.ExportOptions.DiskFileName = "${outputPath.replace(/\\/g, '\\\\')}"

crReport.Export False

' Clean up
Set crReport = Nothing
Set crApp = Nothing

WScript.Echo "Report exported successfully"
WScript.Quit 0
`;

    fs.writeFileSync(vbsPath, vbsScript);
    
    const { stdout, stderr } = await execAsync(`cscript //NoLogo "${vbsPath}"`, { 
      timeout: 120000,
      windowsHide: true 
    });
    
    // Clean up VBS file
    if (fs.existsSync(vbsPath)) {
      fs.unlinkSync(vbsPath);
    }
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) {
        return {
          method: 'VBS COM Automation',
          success: true,
          fileSize: stats.size,
          stdout: stdout?.trim() || '',
          stderr: stderr?.trim() || ''
        };
      }
    }
    
    return {
      method: 'VBS COM Automation',
      success: false,
      error: 'VBS execution failed or no output generated',
      stdout: stdout?.trim() || '',
      stderr: stderr?.trim() || ''
    };
    
  } catch (error) {
    // Clean up VBS file on error
    if (fs.existsSync(vbsPath)) {
      try { fs.unlinkSync(vbsPath); } catch {}
    }
    
    return {
      method: 'VBS COM Automation',
      success: false,
      error: error.message
    };
  }
}

// Batch file approach with enhanced error handling
async function tryBatchFileApproach(crystalExePath, reportPath, outputPath, dbConfig, selectionFormula) {
  const batPath = path.join(path.dirname(outputPath), `cr_batch_${Date.now()}.bat`);
  
  try {
    const batchScript = `@echo off
echo Starting Crystal Reports batch execution...
echo Report: ${reportPath}
echo Output: ${outputPath}

${crystalExePath} "${reportPath}" /E /F:PDF /O:"${outputPath}" /U:${dbConfig.username} /P:${dbConfig.password} /S:${dbConfig.server} /N /X

if exist "${outputPath}" (
    echo Success: PDF file created
    exit /b 0
) else (
    echo Error: PDF file not created
    exit /b 1
)
`;

    fs.writeFileSync(batPath, batchScript);
    
    const { stdout, stderr } = await execAsync(`"${batPath}"`, { 
      timeout: 120000,
      windowsHide: true,
      shell: true
    });
    
    // Clean up batch file
    if (fs.existsSync(batPath)) {
      fs.unlinkSync(batPath);
    }
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) {
        return {
          method: 'Batch File Approach',
          success: true,
          fileSize: stats.size,
          stdout: stdout?.trim() || '',
          stderr: stderr?.trim() || ''
        };
      }
    }
    
    return {
      method: 'Batch File Approach',
      success: false,
      error: 'Batch execution failed or no output generated',
      stdout: stdout?.trim() || '',
      stderr: stderr?.trim() || ''
    };
    
  } catch (error) {
    // Clean up batch file on error
    if (fs.existsSync(batPath)) {
      try { fs.unlinkSync(batPath); } catch {}
    }
    
    return {
      method: 'Batch File Approach',
      success: false,
      error: error.message
    };
  }
}

// Generate comprehensive diagnostics
async function generateDiagnostics(crystalExePath, reportPath, dbConfig) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    system: {},
    crystallReports: {},
    database: {},
    files: {}
  };
  
  try {
    // System information
    const { stdout: systemInfo } = await execAsync('systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Type"', { timeout: 10000 });
    diagnostics.system.info = systemInfo.trim();
  } catch (error) {
    diagnostics.system.error = error.message;
  }
  
  try {
    // Check Crystal Reports processes
    const { stdout: processes } = await execAsync('tasklist | findstr /I "crw32\\|crystal"', { timeout: 5000 });
    diagnostics.crystallReports.runningProcesses = processes.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    diagnostics.crystallReports.runningProcesses = [];
  }
  
  try {
    // Test Oracle connectivity
    const { stdout: tnsping } = await execAsync(`tnsping ${dbConfig.server.split(':')[0]}`, { timeout: 10000 });
    diagnostics.database.connectivity = tnsping.includes('OK') ? 'Success' : 'Failed';
  } catch (error) {
    diagnostics.database.connectivityError = error.message;
  }
  
  // File permissions and accessibility
  diagnostics.files.reportExists = fs.existsSync(reportPath);
  diagnostics.files.crystalExeExists = fs.existsSync(crystalExePath.replace(/"/g, ''));
  
  if (diagnostics.files.reportExists) {
    try {
      const stats = fs.statSync(reportPath);
      diagnostics.files.reportSize = stats.size;
      diagnostics.files.reportModified = stats.mtime.toISOString();
    } catch (error) {
      diagnostics.files.reportError = error.message;
    }
  }
  
  return diagnostics;
}

// Cleanup utility function
function cleanupTempFiles(filePaths) {
  filePaths.filter(Boolean).forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up: ${filePath}`);
      } catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError.message);
      }
    }
  });
}

// Enhanced test endpoint
router.get('/test-crystal-85', async (req, res) => {
  try {
    console.log('🔍 Testing Crystal Reports 8.5 installation...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      executables: [],
      systemInfo: {},
      recommendations: [],
      comObjects: [],
      databaseTest: {}
    };
    
    // Check for Crystal Reports executables
    const possiblePaths = [
      'C:\\Program Files (x86)\\Seagate Software\\Crystal Reports\\crw32.exe',
      'C:\\Program Files\\Seagate Software\\Crystal Reports\\crw32.exe',
      'C:\\Program Files (x86)\\Seagate Software\\Crystal Reports\\crpe32.exe',
      'C:\\Program Files\\Seagate Software\\Crystal Reports\\crpe32.exe',
      'C:\\Program Files (x86)\\Crystal Decisions\\Crystal Reports\\crw32.exe',
      'C:\\Program Files\\Crystal Decisions\\Crystal Reports\\crw32.exe',
      'C:\\Program Files (x86)\\Business Objects\\Crystal Reports\\crw32.exe',
      'C:\\Program Files\\Business Objects\\Crystal Reports\\crw32.exe'
    ];
    
    for (const exePath of possiblePaths) {
      const exists = fs.existsSync(exePath);
      const result = {
        path: exePath,
        exists: exists,
        type: exePath.includes('crpe32') ? 'Print Engine' : 'Report Writer'
      };
      
      if (exists) {
        try {
          const stats = fs.statSync(exePath);
          result.size = stats.size;
          result.modified = stats.mtime.toISOString();
          console.log(`✅ Found: ${exePath}`);
        } catch (statError) {
          result.error = 'Cannot read file stats';
        }
      }
      
      testResults.executables.push(result);
    }
    
    // Test COM objects
    const comObjects = [
      'CrystalReports.Application',
      'CrystalRuntime.Application',
      'Crystal.CRPE.Application'
    ];
    
    for (const comObj of comObjects) {
      try {
        const vbsTest = `
On Error Resume Next
Set obj = CreateObject("${comObj}")
If Err.Number = 0 Then
    WScript.Echo "SUCCESS"
Else
    WScript.Echo "FAILED:" & Err.Description
End If
`;
        const vbsPath = path.join(__dirname, `test_com_${Date.now()}.vbs`);
        fs.writeFileSync(vbsPath, vbsTest);
        
        const { stdout } = await execAsync(`cscript //NoLogo "${vbsPath}"`, { timeout: 5000 });
        
        fs.unlinkSync(vbsPath);
        
        testResults.comObjects.push({
          name: comObj,
          available: stdout.trim().startsWith('SUCCESS'),
          result: stdout.trim()
        });
      } catch (error) {
        testResults.comObjects.push({
          name: comObj,
          available: false,
          error: error.message
        });
      }
    }
    
    // Test database connectivity
    const dbConfig = {
      username: process.env.ORACLE_USER || 'user1',
      server: process.env.DB_SERVER || '10.1.1.191:1521/PROD'
    };
    
    try {
      const { stdout } = await execAsync(`tnsping ${dbConfig.server.split(':')[0]}`, { timeout: 10000 });
      testResults.databaseTest.connectivity = stdout.includes('OK') ? 'Success' : 'Failed';
      testResults.databaseTest.details = stdout.trim();
    } catch (error) {
      testResults.databaseTest.connectivity = 'Error';
      testResults.databaseTest.error = error.message;
    }
    
    // Generate recommendations
    const foundExecutables = testResults.executables.filter(exe => exe.exists);
    const availableCOM = testResults.comObjects.filter(com => com.available);
    
    if (foundExecutables.length === 0) {
      testResults.recommendations.push(
        '❌ No Crystal Reports 8.5 executables found',
        '💡 Install Crystal Reports 8.5 (Seagate Software version)',
        '💡 Check if Crystal Reports is installed in a custom location'
      );
    } else {
      testResults.recommendations.push(`✅ Found ${foundExecutables.length} Crystal Reports executable(s)`);
    }
    
    if (availableCOM.length > 0) {
      testResults.recommendations.push(`✅ Found ${availableCOM.length} working COM object(s) - VBS automation possible`);
    } else {
      testResults.recommendations.push('⚠️ No Crystal Reports COM objects found - VBS automation not available');
    }
    
    if (testResults.databaseTest.connectivity === 'Success') {
      testResults.recommendations.push('✅ Database connectivity test passed');
    } else {
      testResults.recommendations.push('❌ Database connectivity test failed - check Oracle client installation');
    }
    
    // Final status
    const success = foundExecutables.length > 0 || availableCOM.length > 0;
    testResults.status = success ? 'Crystal Reports 8.5 components found' : 'Crystal Reports 8.5 not properly configured';
    
    res.status(success ? 200 : 404).json(testResults);
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint with enhanced checks
router.get('/crystal-report/health', async (req, res) => {
  const reportPath = path.join(__dirname, '..', 'Reports', 'nsf_performance.rpt');
  const tempDir = path.join(__dirname, '..', 'temp_reports');
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: 'Crystal Reports 8.5 - Enhanced with Multiple Automation Methods',
    checks: {
      reportFileExists: fs.existsSync(reportPath),
      tempDirectoryExists: fs.existsSync(tempDir),
      reportFilePath: reportPath,
      tempDirectoryPath: tempDir,
      databaseConfigured: !!(process.env.ORACLE_USER && process.env.ORACLE_PASS)
    },
    automationMethods: {
      commandLine: false,
      comAutomation: false,
      batchFile: false
    },
    diagnostics: {}
  };
  
  try {
    // Check for Crystal Reports executables
    const crPaths = [
      'C:\\Program Files (x86)\\Seagate Software\\Crystal Reports\\crw32.exe',
      'C:\\Program Files\\Seagate Software\\Crystal Reports\\crw32.exe',
      'C:\\Program Files (x86)\\Crystal Decisions\\Crystal Reports\\crw32.exe',
      'C:\\Program Files\\Crystal Decisions\\Crystal Reports\\crw32.exe'
    ];
    
    health.checks.crystalReportsFound = crPaths.some(path => fs.existsSync(path));
    health.automationMethods.commandLine = health.checks.crystalReportsFound;
    
    // Test COM automation availability
    try {
      const vbsTest = `
On Error Resume Next
Set obj = CreateObject("CrystalReports.Application")
If Err.Number = 0 Then
    WScript.Echo "SUCCESS"
Else
    WScript.Echo "FAILED"
End If
`;
      const vbsPath = path.join(tempDir, `health_test_${Date.now()}.vbs`);
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(vbsPath, vbsTest);
      
      const { stdout } = await execAsync(`cscript //NoLogo "${vbsPath}"`, { timeout: 5000 });
      
      // Cleanup test file
      if (fs.existsSync(vbsPath)) {
        fs.unlinkSync(vbsPath);
      }
      
      health.automationMethods.comAutomation = stdout.trim().startsWith('SUCCESS');
      
    } catch (comError) {
      health.automationMethods.comAutomation = false;
      health.diagnostics.comError = comError.message;
    }
    
    // Batch file automation is always available if executable exists
    health.automationMethods.batchFile = health.checks.crystalReportsFound;
    
    // Test database connectivity
    if (health.checks.databaseConfigured) {
      try {
        const dbServer = (process.env.DB_SERVER || '10.1.1.191:1521/PROD').split(':')[0];
        const { stdout } = await execAsync(`tnsping ${dbServer}`, { timeout: 10000 });
        health.checks.databaseConnectivity = stdout.includes('OK');
        health.diagnostics.databaseTest = 'TNS ping successful';
      } catch (dbError) {
        health.checks.databaseConnectivity = false;
        health.diagnostics.databaseError = dbError.message;
      }
    }
    
    // Check for running Crystal Reports processes
    try {
      const { stdout } = await execAsync('tasklist | findstr /I "crw32\\|crystal"', { timeout: 5000 });
      if (stdout.trim()) {
        health.diagnostics.runningProcesses = stdout.trim().split('\n').length;
        health.diagnostics.warning = 'Crystal Reports processes are running - may interfere with automation';
      } else {
        health.diagnostics.runningProcesses = 0;
      }
    } catch (procError) {
      health.diagnostics.runningProcesses = 0;
    }
    
    // Overall health assessment
    const criticalChecks = [
      health.checks.reportFileExists,
      health.checks.crystalReportsFound,
      health.checks.databaseConfigured
    ];
    
    const automationAvailable = Object.values(health.automationMethods).some(method => method);
    
    if (!criticalChecks.every(check => check)) {
      health.status = 'CRITICAL';
    } else if (!automationAvailable) {
      health.status = 'WARNING';
    } else if (health.checks.databaseConnectivity === false) {
      health.status = 'WARNING';
    } else {
      health.status = 'OK';
    }
    
    // Add recommendations based on status
    health.recommendations = [];
    
    if (!health.checks.reportFileExists) {
      health.recommendations.push('❌ Report file not found - check Reports directory');
    }
    
    if (!health.checks.crystalReportsFound) {
      health.recommendations.push('❌ Crystal Reports 8.5 executable not found - install Crystal Reports');
    }
    
    if (!health.checks.databaseConfigured) {
      health.recommendations.push('⚠️ Database credentials not configured - set ORACLE_USER and ORACLE_PASS environment variables');
    }
    
    if (health.checks.databaseConnectivity === false) {
      health.recommendations.push('⚠️ Database connectivity issues - check Oracle client installation');
    }
    
    if (!automationAvailable) {
      health.recommendations.push('❌ No automation methods available - check Crystal Reports installation');
    } else {
      const availableMethods = Object.entries(health.automationMethods)
        .filter(([key, value]) => value)
        .map(([key]) => key);
      health.recommendations.push(`✅ Available automation methods: ${availableMethods.join(', ')}`);
    }
    
    if (health.diagnostics.runningProcesses > 0) {
      health.recommendations.push('⚠️ Close Crystal Reports applications before running automation');
    }
    
  } catch (error) {
    health.status = 'ERROR';
    health.error = error.message;
  }
  
  const statusCode = health.status === 'OK' ? 200 : (health.status === 'WARNING' ? 200 : 500);
  res.status(statusCode).json(health);
});

// Debug endpoint for troubleshooting specific issues
router.post('/crystal-report/debug', async (req, res) => {
  try {
    const { testType } = req.body;
    const debugResult = { timestamp: new Date().toISOString() };
    
    switch (testType) {
      case 'executable-test':
        debugResult.type = 'Executable Test';
        debugResult.result = await testCrystalExecutable();
        break;
        
      case 'com-test':
        debugResult.type = 'COM Automation Test';
        debugResult.result = await testCOMAutomation();
        break;
        
      case 'database-test':
        debugResult.type = 'Database Connectivity Test';
        debugResult.result = await testDatabaseConnection();
        break;
        
      case 'report-file-test':
        debugResult.type = 'Report File Test';
        debugResult.result = await testReportFile();
        break;
        
      default:
        return res.status(400).json({
          error: 'Invalid test type',
          validTypes: ['executable-test', 'com-test', 'database-test', 'report-file-test']
        });
    }
    
    res.json(debugResult);
    
  } catch (error) {
    res.status(500).json({
      error: 'Debug test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions for debug endpoint
async function testCrystalExecutable() {
  const crPaths = [
    'C:\\Program Files (x86)\\Seagate Software\\Crystal Reports\\crw32.exe',
    'C:\\Program Files\\Seagate Software\\Crystal Reports\\crw32.exe'
  ];
  
  const results = [];
  
  for (const exePath of crPaths) {
    const result = { path: exePath, exists: fs.existsSync(exePath) };
    
    if (result.exists) {
      try {
        // Try to get version info
        const { stdout } = await execAsync(`"${exePath}" /?`, { timeout: 5000 });
        result.versionInfo = stdout.trim();
      } catch (error) {
        result.versionError = error.message;
      }
      
      try {
        // Check file properties
        const stats = fs.statSync(exePath);
        result.fileSize = stats.size;
        result.lastModified = stats.mtime.toISOString();
      } catch (statError) {
        result.statError = statError.message;
      }
    }
    
    results.push(result);
  }
  
  return results;
}

async function testCOMAutomation() {
  const comObjects = [
    'CrystalReports.Application',
    'CrystalRuntime.Application',
    'Crystal.CRPE.Application'
  ];
  
  const results = [];
  
  for (const comObj of comObjects) {
    try {
      const vbsTest = `
On Error Resume Next
Set obj = CreateObject("${comObj}")
If Err.Number = 0 Then
    WScript.Echo "SUCCESS: Object created successfully"
    ' Try to get version if possible
    On Error Resume Next
    WScript.Echo "Version: " & obj.Version
    Set obj = Nothing
Else
    WScript.Echo "FAILED: " & Err.Description & " (Error: " & Err.Number & ")"
End If
`;
      
      const vbsPath = path.join(__dirname, `test_${comObj.replace(/\./g, '_')}_${Date.now()}.vbs`);
      fs.writeFileSync(vbsPath, vbsTest);
      
      const { stdout, stderr } = await execAsync(`cscript //NoLogo "${vbsPath}"`, { timeout: 10000 });
      
      fs.unlinkSync(vbsPath);
      
      results.push({
        comObject: comObj,
        result: stdout.trim(),
        stderr: stderr?.trim() || '',
        success: stdout.includes('SUCCESS')
      });
      
    } catch (error) {
      results.push({
        comObject: comObj,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

async function testDatabaseConnection() {
  const dbConfig = {
    server: process.env.DB_SERVER || '10.1.1.191:1521/PROD',
    username: process.env.ORACLE_USER || 'user1'
  };
  
  const result = { server: dbConfig.server, username: dbConfig.username };
  
  try {
    // Test TNS ping
    const serverHost = dbConfig.server.split(':')[0];
    const { stdout: tnsResult } = await execAsync(`tnsping ${serverHost}`, { timeout: 15000 });
    result.tnsping = {
      success: tnsResult.includes('OK'),
      output: tnsResult.trim()
    };
  } catch (tnsError) {
    result.tnsping = {
      success: false,
      error: tnsError.message
    };
  }
  
  try {
    // Test basic connectivity using telnet (if available)
    const [host, port] = dbConfig.server.split(':');
    const actualPort = port ? port.split('/')[0] : '1521';
    
    const { stdout: telnetResult } = await execAsync(`telnet ${host} ${actualPort}`, { timeout: 5000 });
    result.telnet = {
      success: true,
      output: 'Connection successful'
    };
  } catch (telnetError) {
    result.telnet = {
      success: false,
      error: telnetError.message
    };
  }
  
  return result;
}

async function testReportFile() {
  const reportPath = path.join(__dirname, '..', 'Reports', 'nsf_performance.rpt');
  const result = { path: reportPath };
  
  try {
    result.exists = fs.existsSync(reportPath);
    
    if (result.exists) {
      const stats = fs.statSync(reportPath);
      result.size = stats.size;
      result.lastModified = stats.mtime.toISOString();
      result.readable = true;
      
      // Try to read first few bytes to verify it's accessible
      const fd = fs.openSync(reportPath, 'r');
      const buffer = Buffer.alloc(100);
      fs.readSync(fd, buffer, 0, 100, 0);
      fs.closeSync(fd);
      
      result.fileType = buffer.toString('ascii', 0, 20).replace(/[^\x20-\x7E]/g, '.');
      
    } else {
      result.directoryExists = fs.existsSync(path.dirname(reportPath));
      result.parentDirectory = path.dirname(reportPath);
      
      // List files in Reports directory if it exists
      if (result.directoryExists) {
        result.filesInDirectory = fs.readdirSync(path.dirname(reportPath));
      }
    }
    
  } catch (error) {
    result.error = error.message;
    result.accessible = false;
  }
  
  return result;
}

module.exports = router;