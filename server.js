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

// Check if public directory exists
const publicPath = path.join(__dirname, "public");
console.log("Checking public directory:", publicPath);
console.log("Public directory exists:", fs.existsSync(publicPath));

if (fs.existsSync(publicPath)) {
  console.log("Files in public directory:", fs.readdirSync(publicPath));
}

// Serve login.html at the root URL with error handling
app.get("/", (req, res) => {
  const loginPath = path.join(__dirname, "public", "login.html");
  console.log("Looking for login.html at:", loginPath);
  
  if (fs.existsSync(loginPath)) {
    res.sendFile(loginPath);
  } else {
    console.error("login.html not found at:", loginPath);
    res.status(404).send(`
      <h1>File Not Found</h1>
      <p>login.html is missing from the public directory</p>
      <p>Expected location: ${loginPath}</p>
    `);
  }
});

// Serve other static files
app.use(express.static(path.join(__dirname, "public")));

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