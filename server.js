require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const oracledb = require("oracledb");


// Import MySQL & Oracle connections
const mysqlDb = require("./config/mysqlConnection"); // ✅ MySQL Connection
const connectOracle = require("./config/oracleConnection"); // ✅ Oracle Connection
const mysqlDb1 = require("./config/inhouseConnection"); // ✅ Oracle Connection

const app = express();
app.use(cors());
app.use(cors({ origin: "http://127.0.0.1:5501", credentials: true }));
app.use(bodyParser.json());

// ✅ Serve static files
app.use("/js", express.static(path.join(__dirname, "public/js")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Establish Oracle Connection and store it globally in app.locals
connectOracle()
  .then((db) => {
    app.locals.oracleDb = db; // ✅ Store Oracle connection globally
    console.log("✅ Oracle connection stored in app.locals");
  })
  .catch((err) => {
    console.error("❌ Oracle connection error:", err);
  });

  // ✅ Import and register EXE execution routes
const exeRoutes = require("./routes/exeRoutes");
app.use("/api/run-exe", exeRoutes);

// ✅ Register Routes
app.use("/api/facility-visits", require("./routes/facilityRoutes")); // MySQL CRUD
app.use("/api/unsat", require("./routes/unsatRoutes"));
app.use("/api/unsat", require("./routes/rateRoutes")); // Unsatisfactory Section (Oracle)
app.use("/api/oracle", require("./routes/oracleRoutes")); // Future Oracle routes
app.use("/api/inc-dec", require("./routes/inc_decRoutes")); 
app.use("/api/auth", require("./routes/loginRoutes")); // ✅ Authentication Routes
app.use("/api", require("./routes/exeRoutes")); // ✅ Register EXE Routes
app.use("/api/timeliness", require("./routes/timelinessRoutes"));
app.use("/api/lab-total-samples-per-day", require("./routes/labTotalSamplesPerDayRoutes"));  // Chart for Total Samples Per Day at laboratory dashboard
app.use("/api/lab-comparison-samples-per-day", require("./routes/labComparisonOfDailySamples"));  // Chart for Total Samples Per Day at laboratory dashboard
app.use("/api", require("./routes/ytdSampleRoutes")); //chart for year to date samples received and screened
app.use("/api", require("./routes/cumulativeCencusofSamplesRoutes"));  //chart for cumulative samples received and screened
app.use("/api", require("./routes/cumulativeAnnualRoutes")); // ✅ Cumulative Annual Census
app.use("/api", require("./routes/cumulativeAnnualRoutes")); // ✅ Cumulative Annual Census
app.use("/api", require("./routes/cumulativeAnnualRoutes")); // ✅ Cumulative Annual Census
app.use("/api/total-samples", require("./routes/cardSummaryRoutes")); // ✅ Add total sample count route
app.use("/api/neometrics", require("./routes/neometricsRoutes")); // neometrics routes
app.use("/api/demog-summary-count", require("./routes/demogSummaryRoutes")); // demog summary routes
app.use("/api/speed-monitoring", require("./routes/speedMonitoringRoutes")); //speed monitoring routes
app.use("/api/common-error", require("./routes/commonErrorRoutes")); //this is for common error of demographics
app.use("/api/lab-tracking", require("./routes/labTrackingRoutes")); //routes for lab tracking system
app.use("/api/unsat-rate", require("./routes/unsatRateRoutes")); //routes for unsat rate ytd
app.use("/api/kits-sold", require("./routes/kitsSoldRoutes")); //routes for kits sold
app.use("/api/cumulative-kits-sold", require("./routes/cumulativeKitsSold")); //cumulative monthly kits sold
app.use("/api/attendance-late", require("./routes/attendanceRoutes")); // for attendance
app.use("/api/list-facilities", require("./routes/listFacilityRoute")); //list facility route
app.use("/api/lab-supplies", require("./routes/labSuppliesRoutes")); //lab supplies
app.use("/api/lab-reagents", require("./routes/labReagentRoutes")); //lab reagents

app.use("/api", require("./routes/labReagentRoutes")); //lab reagents

app.use("/api/patient-info", require("./routes/patient_notebookRoutes")); // for patient details
app.use("/api/patient-details", require("./routes/patient-detailsRoutes")); // for patient details
app.use("/api", require("./routes/notebookRoutes")); // for patient details

app.use("/api/notebook-query", require("./routes/notebookQuery")); // for patient details


app.use((err, req, res, next) => {
  console.error(err.stack); // Log error
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// ✅ Debugging Route - Check if OracleDB is Set
app.get("/api/check-oracle", (req, res) => {
  if (!app.locals.oracleDb) {
      return res.status(500).json({ error: "Oracle connection is not initialized" });
  }
  res.json({ message: "✅ Oracle connection is active!" });
});


// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
