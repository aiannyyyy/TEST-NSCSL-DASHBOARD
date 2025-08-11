
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
const mysql2Db = require("./config/mysqlConnectionPromise"); // ✅ MySQL Promise Connection

const app = express();

// Environment-specific configuration
const isProduction = false; // Test environment
const isDevelopment = true; // Test environment

// CORS configuration for test environment
const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin || 'no-origin');
    
    // Allow requests with no origin (direct access, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (isDevelopment) {
      // Test environment - localhost only
      const allowedOrigins = [
        'http://127.0.0.1:5501',
        'http://localhost:5501',
        'http://localhost:3000',
        'http://localhost:3001', // Test port
        // Allow any localhost development ports
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else {
          return allowed.test(origin);
        }
      });
      
      if (isAllowed) {
        console.log('✅ CORS allowed for:', origin);
        callback(null, true);
      } else {
        console.log('❌ CORS blocked for:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Production: allow all or configure specific domains
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.ip || req.connection.remoteAddress;
  const origin = req.get('Origin') || 'direct-access';
  console.log(`[${timestamp}] ${req.method} ${req.url} | Client: ${clientIP} | Origin: ${origin}`);
  next();
});

// Set public path to public directory only
const publicPath = path.join(__dirname, 'public');

console.log("=".repeat(50));
console.log("🚀 TEST SERVER STARTUP");
console.log("=".repeat(50));
console.log("Environment:", isProduction ? 'production' : 'test');
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
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Additional static file routes for specific asset types
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/css', express.static(publicPath));
app.use('/js', express.static(publicPath));
app.use('/uploads', express.static('\\\\10.1.1.151\\uploads'));

// Main route - serve login.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// Direct route for /login.html
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// Health check endpoint with detailed network info
app.get("/health", (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const serverIPs = [];
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(interface => {
      if (interface.family === 'IPv4' && !interface.internal) {
        serverIPs.push({
          interface: interfaceName,
          ip: interface.address
        });
      }
    });
  });
  
  res.json({ 
    status: "✅ Test Server is running",
    timestamp: new Date().toISOString(),
    server: {
      environment: "test",
      port: 3001,
      ips: serverIPs
    },
    client: {
      ip: req.ip || req.connection.remoteAddress,
      origin: req.get('Origin') || 'direct-access',
      userAgent: req.get('User-Agent')
    },
    paths: {
      publicPath: publicPath,
      publicExists: fs.existsSync(publicPath),
      loginExists: fs.existsSync(path.join(publicPath, "login", "login.html"))
    }
  });
});

// Network connectivity test endpoint
app.get("/test", (req, res) => {
  res.send(`
    <h1>✅ Test Network Connection Successful!</h1>
    <p><strong>Server:</strong> localhost:3001</p>
    <p><strong>Your IP:</strong> ${req.ip || req.connection.remoteAddress}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    <hr>
    <h3>Available Endpoints:</h3>
    <ul>
      <li><a href="/">Dashboard (Login)</a></li>
      <li><a href="/login.html">Login Page (Direct)</a></li>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/test">This Test Page</a></li>
    </ul>
  `);
});

// Establish Test Oracle Connection with better error handling
connectOracle()
  .then((db) => {
    app.locals.oracleDb = db;
    console.log("✅ Test Oracle connection stored in app.locals");
  })
  .catch((err) => {
    console.error("❌ Test Oracle connection error:", err);
    // Don't exit the process, just log the error
  });

// Import and register all your existing routes
const exeRoutes = require("./routes/exeRoutes");
app.use("/api/run-exe", exeRoutes);

app.use("/api/facility-visits", require("./routes/facilityRoutes"));
app.use("/api/unsat", require("./routes/unsatRoutes"));
app.use("/api/unsat", require("./routes/rateRoutes"));
app.use("/api/oracle", require("./routes/oracleRoutes"));
app.use("/api/inc-dec", require("./routes/inc_decRoutes"));
app.use("/api/auth", require("./routes/loginRoutes"));
app.use("/api", require("./routes/exeRoutes"));
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

app.use("/api/endorsement", require("./routes/endorsementRoutes")); //FOR ENDORSEMENT
app.use("/api/endorsement-details", require("./routes/endorsmentDetailsRoutes")); //FOR ENDORSEMENT DETAILS
app.use("/api/pdo-notification", require("./routes/pdoNotificationRoutes")); //FOR PDO NOTIFICATIONS
app.use("/api/pdo-endorsement", require("./routes/pdo-endorsement-routes")); //FOR PDO ENDORSEMENT PAGE

app.use("/api", require("./routes/nsf-performanceRoutes")); // FOR NSF PERFORMANCE
app.use("/api", require("./routes/nsf-performance-generation")); // FOR NSF PERFORMANCE GENERATION


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", require("./routes/nsf-crystalRoutes")); // FOR NSF CRYSTAL REPORTS

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Test Server Error:", err.stack || err.message || err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Debugging Route - Check if Test OracleDB is Set
app.get("/api/check-oracle", (req, res) => {
  if (!app.locals.oracleDb) {
    return res.status(500).json({ error: "Test Oracle connection is not initialized" });
  }
  res.json({ message: "✅ Test Oracle connection is active!" });
});

// Catch-all route for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Route not found", 
    path: req.originalUrl,
    server: "localhost:3001",
    available_endpoints: ["/", "/login.html", "/health", "/test"]
  });
});

// Test Server startup - PORT 3001 for test environment
const PORT = process.env.TEST_PORT || 3001;

app.listen(PORT, 'localhost', () => {
  console.log(`🚀 Test Server running on http://localhost:${PORT}`);
  console.log(`🧪 Test Environment Active`);
});
