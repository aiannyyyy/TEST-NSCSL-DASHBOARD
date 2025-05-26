const mysql = require("mysql2");
require("dotenv").config();

const mysqlDb = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: 20000,      // 20 seconds
  acquireTimeout: 20000,      // 20 seconds  
  timeout: 20000,             // 20 seconds
  reconnect: true,
  idleTimeout: 300000,        // 5 minutes
  maxReconnects: 3
});

mysqlDb.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database.");
});