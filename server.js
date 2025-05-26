require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const oracledb = require("oracledb");

// Import MySQL & Oracle connections
const mysqlDb = require("./config/mysqlConnection"); // ✅ MySQL Connection
const connectOracle = require("./config/oracleConnection"); // ✅ Oracle Connection
const mysqlDb1 = require("./config/inhouseConnection"); // ✅ Oracle Connection

const app = express();
app.use(cors());
app.use(cors({ origin: "http://127.0.0.1:5501", credentials: true }));
app.use(bodyParser.json());

// Check current directory and list all files
console.log("Current directory:", __dirname);
console.log("Files in current directory:", fs.readdirSync(__dirname));

// Check if public directory exists, if not, serve from current directory
const publicPath = path.join(__dirname, "public");
const hasPublicDir = fs.existsSync(publicPath);

console.log("Checking public directory:", publicPath);
console.log("Public directory exists:", hasPublicDir);

if (hasPublicDir) {
  console.log("Files in public directory:", fs.readdirSync(publicPath));
} else {
  console.log("No public directory found, will serve HTML files from src directory");
}

// Serve login.html at the root URL with error handling
app.get("/", (req, res) => {
  // Try public directory first, then current directory
  const loginPaths = [
    path.join(__dirname, "public", "login.html"),
    path.join(__dirname, "login.html")
  ];
  
  let loginPath = null;
  for (const path of loginPaths) {
    console.log("Checking for login.html at:", path);
    if (fs.existsSync(path)) {
      loginPath = path;
      break;
    }
  }
  
  if (loginPath) {
    console.log("Found login.html at:", loginPath);
    res.sendFile(loginPath);
  } else {
    console.error("login.html not found in any expected location");
    res.status(404).send(`
      <h1>File Not Found</h1>
      <p>login.html is missing from both public directory and src directory</p>
      <p>Checked locations:</p>
      <ul>
        ${loginPaths.map(p => `<li>${p}</li>`).join('')}
      </ul>
      <p>Current directory: ${__dirname}</p>
      <p>Files in current directory: ${fs.readdirSync(__dirname).join(', ')}</p>
    `);
  }
});

// Serve other static files - try public first, then current directory
if (hasPublicDir) {
  app.use(express.static(path.join(__dirname, "public")));
} else {
  app.use(express.static(__dirname));
}

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
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

// Import and register EXE execution routes
const exeRoutes = require("./routes/exeRoutes");
app.use("/api/run-exe", exeRoutes);

// Register Routes
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
  console.log(`📁 Serving static files from: ${path.join(__dirname, "public")}`);
});