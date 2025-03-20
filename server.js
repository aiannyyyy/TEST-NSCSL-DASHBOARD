require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const oracledb = require("oracledb");


// Import MySQL & Oracle connections
const mysqlDb = require("./config/mysqlConnection"); // ✅ MySQL Connection
const connectOracle = require("./config/oracleConnection"); // ✅ Oracle Connection

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

// ✅ Register Routes
app.use("/api/facility-visits", require("./routes/facilityRoutes")); // MySQL CRUD
app.use("/api/unsat", require("./routes/unsatRoutes"));
app.use("/api/unsat", require("./routes/rateRoutes")); // Unsatisfactory Section (Oracle)
app.use("/api/oracle", require("./routes/oracleRoutes")); // Future Oracle routes
app.use("/api/inc-dec", require("./routes/inc_decRoutes")); 
app.use("/api/auth", require("./routes/loginRoutes")); // ✅ Authentication Routes


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
