const mysql = require("mysql2"); // or mysql2 if you use that
require("dotenv").config();

const mysqlDb1 = mysql.createConnection({
    host: process.env.HOST_DB,
    user: process.env.USER_DB,
    password: process.env.PASS_DB,
    database: "nscaccount", // Add this if you're always using this database
});

mysqlDb1.connect((err) => {
    if (err) {
        console.error("❌ MySQL connection failed:", err.message);
        process.exit(1);
    }
    console.log("✅ Connected to In House MySQL database.");
});

module.exports = mysqlDb1; // << This is important!
