
const mysql = require("mysql2");
require("dotenv").config();

const mysqlDb = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306  // <-- Add this line
});

mysqlDb.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database.");
});

module.exports = mysqlDb;

/*
const mysql = require("mysql2");
require("dotenv").config();

let mysqlDb;

// Connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  
  // ✅ Settings to keep connection alive as long as possible
  acquireTimeout: 60000,        // 60 seconds to establish connection
  timeout: 0,                   // No timeout for queries (use with caution)
  reconnect: true,              // Auto-reconnect on disconnect
  keepAliveInitialDelay: 0,     // Start keep-alive immediately
  enableKeepAlive: true,        // Enable TCP keep-alive
  
  // ✅ Additional settings for persistent connection
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: false,
  debug: false,
  multipleStatements: false
};

// ✅ Function to create and maintain persistent connection
function createPersistentConnection() {
  mysqlDb = mysql.createConnection(dbConfig);
  
  // Handle successful connection
  mysqlDb.connect((err) => {
    if (err) {
      console.error("❌ MySQL connection failed:", err.message);
      console.log("🔄 Retrying connection in 5 seconds...");
      setTimeout(createPersistentConnection, 5000);
      return;
    }
    console.log("✅ Connected to MySQL database (Persistent Mode)");
    console.log(`📡 Connection ID: ${mysqlDb.threadId}`);
  });

  // ✅ Handle connection errors and auto-reconnect
  mysqlDb.on('error', function(err) {
    console.error('❌ MySQL Connection Error:', err);
    
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔄 MySQL connection lost. Reconnecting...');
      createPersistentConnection();
    } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
      console.log('🔄 MySQL connection quit. Reconnecting...');
      createPersistentConnection();
    } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
      console.log('🔄 MySQL fatal error. Reconnecting...');
      createPersistentConnection();
    } else if (err.code === 'ECONNREFUSED') {
      console.error('❌ MySQL server refused connection. Retrying in 10 seconds...');
      setTimeout(createPersistentConnection, 10000);
    } else {
      console.error('❌ MySQL Error Code:', err.code);
      console.log('🔄 Attempting to reconnect...');
      createPersistentConnection();
    }
  });

  // ✅ Handle connection end
  mysqlDb.on('end', function() {
    console.log('⚠️ MySQL connection ended. Reconnecting...');
    createPersistentConnection();
  });
}

// ✅ Keep-alive function to prevent idle timeouts
function keepConnectionAlive() {
  if (mysqlDb && mysqlDb.state !== 'disconnected') {
    mysqlDb.query('SELECT 1', (err, results) => {
      if (err) {
        console.error('❌ Keep-alive query failed:', err.message);
      } else {
        console.log('💓 MySQL keep-alive ping successful');
      }
    });
  }
}

// ✅ Create initial connection
createPersistentConnection();

// ✅ Send keep-alive ping every 4 hours (MySQL default timeout is 8 hours)
setInterval(keepConnectionAlive, 4 * 60 * 60 * 1000); // 4 hours

// ✅ Also send keep-alive ping every 5 minutes for extra safety
setInterval(keepConnectionAlive, 5 * 60 * 1000); // 5 minutes

// ✅ Wrapper function to handle queries safely
function safeQuery(query, params, callback) {
  // If only 2 parameters, callback is the second parameter
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }
  
  // Check if connection is alive
  if (!mysqlDb || mysqlDb.state === 'disconnected') {
    console.log('⚠️ Connection not ready, reconnecting...');
    createPersistentConnection();
    
    // Retry after 2 seconds
    setTimeout(() => {
      safeQuery(query, params, callback);
    }, 2000);
    return;
  }
  
  // Execute query
  mysqlDb.query(query, params, (error, results, fields) => {
    if (error && (error.code === 'PROTOCOL_CONNECTION_LOST' || 
                  error.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT')) {
      console.log('🔄 Connection lost during query, reconnecting...');
      createPersistentConnection();
      
      // Retry query after reconnection
      setTimeout(() => {
        safeQuery(query, params, callback);
      }, 2000);
      return;
    }
    
    // Call original callback
    callback(error, results, fields);
  });
}

// ✅ Export connection with safe query wrapper
module.exports = {
  // Original connection for backward compatibility
  query: safeQuery,
  
  // Access to raw connection if needed
  connection: mysqlDb,
  
  // Helper to check connection status
  isConnected: () => mysqlDb && mysqlDb.state === 'authenticated',
  
  // Manual reconnect function
  reconnect: createPersistentConnection
};

*/