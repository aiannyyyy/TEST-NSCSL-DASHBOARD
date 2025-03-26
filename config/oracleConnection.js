const oracledb = require("oracledb");
require("dotenv").config();

async function connectOracle() {
    try {
        const connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASS,
            connectString: process.env.ORACLE_CONN_STRING,
        });

        console.log("✅ Connected to Oracle database (Read-Only).");

        // Run a simple query to verify connection
        const result = await connection.execute("SELECT * FROM dual");
        console.log("🔹 Oracle Test Query Result:", result.rows);

        return connection; // Ensure connection is returned
    } catch (err) {
        console.error("❌ Oracle connection failed:", err.message);
        return null; // Return null instead of exiting process
    }
}

module.exports = connectOracle;
