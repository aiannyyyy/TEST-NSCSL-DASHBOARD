require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const oracledb = require("oracledb");

// Import MySQL & Oracle connections (config is at project root)
const mysqlDb = require("./config/mysqlConnection"); // ✅ MySQL Connection
const connectOracle = require("./config/oracleConnection"); // ✅ Oracle Connection
const mysqlDb1 = require("./config/inhouseConnection"); // ✅ Oracle Connection

const app = express();

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// CORS configuration
if (isDevelopment) {
  app.use(cors({ origin: "http://127.0.0.1:5501", credentials: true }));
} else {
  app.use(cors());
}
app.use(bodyParser.json());

// Determine the correct public path based on environment
const publicPath = isProduction 
  ? path.join(__dirname, 'public') 
  : path.join(__dirname, 'src');

console.log("Environment:", isProduction ? 'production' : 'development');
console.log("Current directory:", __dirname);
console.log("Public path:", publicPath);

// Check if directories exist and log contents
if (fs.existsSync(__dirname)) {
  console.log("Root directory files:", fs.readdirSync(__dirname));
}

if (fs.existsSync(publicPath)) {
  console.log("✅ Public directory exists:", publicPath);
  console.log("Files in public directory:", fs.readdirSync(publicPath));
} else {
  console.log("❌ Public directory doesn't exist:", publicPath);
  
  // Check alternative paths
  const altPath = path.join(__dirname, 'src');
  if (fs.existsSync(altPath)) {
    console.log("✅ Found alternative path:", altPath);
    console.log("Files in src/:", fs.readdirSync(altPath));
  }
}

// Serve static files from the public directory
app.use(express.static(publicPath));

// Additional static file routes for specific asset types
app.use('/assets', express.static(path.join(__dirname, 'src', 'assets')));
app.use('/css', express.static(publicPath));
app.use('/js', express.static(publicPath));

// Main route - serve login.html at root
app.get("/", (req, res) => {
  const loginPath = path.join(publicPath, "login.html");
  console.log("Looking for login.html at:", loginPath);
  
  if (fs.existsSync(loginPath)) {
    console.log("✅ Found login.html, serving file");
    res.sendFile(loginPath);
  } else {
    console.error("❌ login.html not found at:", loginPath);
    
    // Try alternative location
    const altLoginPath = path.join(__dirname, "src", "login.html");
    if (fs.existsSync(altLoginPath)) {
      console.log("✅ Found login.html at alternative path:", altLoginPath);
      res.sendFile(altLoginPath);
    } else {
      // Provide debug information
      const debugInfo = {
        environment: isProduction ? 'production' : 'development',
        currentDir: __dirname,
        publicPath: publicPath,
        expectedFile: loginPath,
        rootFiles: fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : "Can't read root",
        srcExists: fs.existsSync(path.join(__dirname, "src")),
        publicExists: fs.existsSync(publicPath),
        publicFiles: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : "Directory doesn't exist"
      };
      
      res.status(404).send(`
        <h1>File Not Found - Debug Info</h1>
        <p><strong>Environment:</strong> ${debugInfo.environment}</p>
        <p><strong>Expected location:</strong> ${debugInfo.expectedFile}</p>
        <p><strong>Current directory:</strong> ${debugInfo.currentDir}</p>
        <p><strong>Public path:</strong> ${debugInfo.publicPath}</p>
        <p><strong>Public directory exists:</strong> ${debugInfo.publicExists}</p>
        <p><strong>Files in public directory:</strong> ${Array.isArray(debugInfo.publicFiles) ? debugInfo.publicFiles.join(', ') : debugInfo.publicFiles}</p>
        <p><strong>Root directory files:</strong> ${Array.isArray(debugInfo.rootFiles) ? debugInfo.rootFiles.join(', ') : debugInfo.rootFiles}</p>
      `);
    }
  }
});

// Explicit routes for HTML files (fallback)
const htmlFiles = ['admin.html', 'login.html', 'index.html', 'demographics.html', 'followup.html', 'labindex.html', 'buttons.html'];

htmlFiles.forEach(fileName => {
  app.get(`/${fileName}`, (req, res) => {
    const filePath = path.join(publicPath, fileName);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      // Try alternative path
      const altPath = path.join(__dirname, 'src', fileName);
      if (fs.existsSync(altPath)) {
        res.sendFile(altPath);
      } else {
        res.status(404).send(`<h1>File Not Found</h1><p>${fileName} not found in either location.</p>`);
      }
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    publicPath: publicPath,
    publicExists: fs.existsSync(publicPath)
  });
});

// Establish Oracle Connection with better error handling
connectOracle()
  .then((db) => {
    app.locals.oracleDb = db; // ✅ Store Oracle connection globally
    console.log("✅ Oracle connection stored in app.locals");
  })
  .catch((err) => {
    console.error("❌ Oracle connection error:", err);
    // Don't exit the process, just log the error
  });

// Import and register EXE execution routes (routes are at project root)
const exeRoutes = require("./routes/exeRoutes");
app.use("/api/run-exe", exeRoutes);

// Register Routes (all routes are at project root)
app.use("/api/facility-visits", require("./routes/facilityRoutes")); // MySQL CRUD
app.use("/api/unsat", require("./routes/unsatRoutes"));
app.use("/api/unsat", require("./routes/rateRoutes")); // Unsatisfactory Section (Oracle)
app.use("/api/oracle", require("./routes/oracleRoutes")); // Future Oracle routes
app.use("/api/inc-dec", require("./routes/inc_decRoutes"));
app.use("/api/auth", require("./routes/loginRoutes")); // ✅ Authentication Routes
app.use("/api", require("./routes/exeRoutes")); // ✅ Register EXE Routes
app.use("/api/timeliness", require("./routes/timelinessRoutes"));
app.use("/api/lab-total-samples-per-day", require("./routes/labTotalSamplesPerDayRoutes"));
app.use("/api/lab-comparison-samples-per-day", require("./routes/labComparisonOfDailySamples"));
app.use("/api", require("./routes/ytdSampleRoutes"));
app.use("/api", require("./routes/cumulativeCencusofSamplesRoutes"));
app.use("/api", require("./routes/cumulativeAnnualRoutes"));
app.use("/api/total-samples", require("./routes/cardSummaryRoutes"));
app.use("/api/neometrics", require("./routes/neometricsRoutes"));
app.use("/api/demog-summary-count", require("./routes/demogSummaryRoutes"));
app.use("/api/speed-monitoring", require("./routes/speedMonitoringRoutes"));
app.use("/api/common-error", require("./routes/commonErrorRoutes"));
app.use("/api/lab-tracking", require("./routes/labTrackingRoutes"));
app.use("/api/unsat-rate", require("./routes/unsatRateRoutes"));
app.use("/api/kits-sold", require("./routes/kitsSoldRoutes"));
app.use("/api/cumulative-kits-sold", require("./routes/cumulativeKitsSold"));
app.use("/api/attendance-late", require("./routes/attendanceRoutes"));
app.use("/api/list-facilities", require("./routes/listFacilityRoute"));
app.use("/api/lab-supplies", require("./routes/labSuppliesRoutes"));
app.use("/api/lab-reagents", require("./routes/labReagentRoutes"));
app.use("/api", require("./routes/labReagentRoutes"));
app.use("/api/patient-info", require("./routes/patient_notebookRoutes"));
app.use("/api/patient-details", require("./routes/patient-detailsRoutes"));
app.use("/api", require("./routes/notebookRoutes"));
app.use("/api/notebook-query", require("./routes/notebookQuery"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error stack:", err.stack);
  res.status(500).json({ 
    error: "Internal Server Error", 
    details: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

// Debugging Route - Check if OracleDB is Set
app.get("/api/check-oracle", (req, res) => {
  if (!app.locals.oracleDb) {
    return res.status(500).json({ error: "Oracle connection is not initialized" });
  }
  res.json({ message: "✅ Oracle connection is active!" });
});

// Catch-all route for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${publicPath}`);
  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
});