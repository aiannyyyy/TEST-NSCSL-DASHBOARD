const mysql = require("mysql2/promise"); // ✅ Use the promise version
require("dotenv").config();

const mysqlDb = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("✅ MySQL pool created.");

module.exports = mysqlDb;
