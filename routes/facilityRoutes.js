/*

const express = require("express");
const router = express.Router();
const db = require("../config/mysqlConnection"); // ✅ Correct

// 🔹 Get all facility visits
router.get("/", (req, res) => {
    db.query("SELECT * FROM test_pdo_visit", (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});

// 🔹 Add a new facility visit
router.post("/", (req, res) => {
    const { facility_code, facility_name, date_visited, province, status, remarks, mark } = req.body;
    const sql = "INSERT INTO test_pdo_visit (facility_code, facility_name, date_visited, province, status, remarks, mark) VALUES (?, ?, ?, ?, ?, ?, ?)";

    db.query(sql, [facility_code, facility_name, date_visited, province, status, remarks, mark], (err, result) => {
        if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({ error: "Failed to add facility visit" });
        }
        res.json({ message: "Facility visit added successfully", id: result.insertId });
    });
});

// 🔹 Update a facility visit
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { facility_code, facility_name, date_visited, province, status, remarks, mark } = req.body;
    const sql = "UPDATE test_pdo_visit SET facility_code=?, facility_name=?, date_visited=?, province=?, status=?, remarks=?, mark=? WHERE id=?";

    db.query(sql, [facility_code, facility_name, date_visited, province, status, remarks, mark, id], (err, result) => {
        if (err) {
            console.error("Update error:", err);
            return res.status(500).json({ error: "Failed to update facility visit" });
        }
        res.json({ message: "Facility visit updated successfully" });
    });
});

// 🔹 Delete a facility visit
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM test_pdo_visit WHERE id=?";

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete error:", err);
            return res.status(500).json({ error: "Failed to delete facility visit" });
        }
        res.json({ message: "Facility visit deleted successfully" });
    });
});

// 🔹 Update facility visit status
router.patch("/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const sql = "UPDATE test_pdo_visit SET status=? WHERE id=?";

    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Status update error:", err);
            return res.status(500).json({ error: "Failed to update status" });
        }
        res.json({ message: "Status updated successfully" });
    });
});

router.get("/facility-status-count", (req, res) => {
  const { date_from, date_to } = req.query;

  let sql = `
    SELECT
      SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = '0' THEN 1 ELSE 0 END) AS inactive,
      SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) AS closed
    FROM test_pdo_visit
    WHERE date_visited BETWEEN ? AND ?
  `;

  // Use default month range if date_from or date_to missing (optional)
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const defaultFrom = new Date(year, month, 1).toISOString().split("T")[0];
  const defaultTo = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const fromDate = date_from || defaultFrom;
  const toDate = date_to || defaultTo;

  db.query(sql, [fromDate, toDate], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results[0]); // return {active, inactive, closed}
  });
});


// 🔹 Get facilities by status and date range (e.g. active, inactive, closed)
router.get("/facilities-by-status/:status", (req, res) => {
    const { status } = req.params;
    const { startDate, endDate } = req.query;

    // Base SQL with status filter
    let sql = `
        SELECT 
            facility_code,
            facility_name,
            date_visited,
            province
        FROM test_pdo_visit
        WHERE status = ?
    `;

    // Parameters array for the query placeholders
    const params = [status];

    // Add date range filtering if both dates are provided
    if (startDate && endDate) {
        sql += " AND date_visited BETWEEN ? AND ?";
        params.push(startDate, endDate);
    } else if (startDate) {
        // If only startDate is provided, filter date_visited >= startDate
        sql += " AND date_visited >= ?";
        params.push(startDate);
    } else if (endDate) {
        // If only endDate is provided, filter date_visited <= endDate
        sql += " AND date_visited <= ?";
        params.push(endDate);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching facilities by status and date:", err);
            return res.status(500).json({ error: "Failed to retrieve facilities" });
        }
        res.json(results);
    });
});

module.exports = router;

*/

const express = require("express");
const router = express.Router();
const db = require("../config/mysqlConnection");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // ADD THIS MISSING IMPORT

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// 🔹 Get all facility visits
router.get("/", (req, res) => {
  db.query("SELECT * FROM test_pdo_visit order by date_visited desc", (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});

// 🔹 Add a new facility visit with file upload
router.post("/", upload.array("attachments"), (req, res) => {
  const {
    facility_code,
    facility_name,
    date_visited,
    province,
    status,
    remarks,
    mark,
  } = req.body;

  const filePaths = req.files.map((file) => "uploads/" + file.filename).join(",");

  const sql = `
    INSERT INTO test_pdo_visit 
    (facility_code, facility_name, date_visited, province, status, remarks, mark, attachment_path) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      facility_code,
      facility_name,
      date_visited,
      province,
      status,
      remarks,
      mark,
      filePaths,
    ],
    (err, result) => {
      if (err) {
        console.error("Insert error:", err);
        return res.status(500).json({ error: "Failed to add facility visit" });
      }
      res.json({ message: "Facility visit added successfully", id: result.insertId });
    }
  );
});

// 🔹 Update a facility visit with file management
router.put("/:id", upload.array("attachments"), (req, res) => {
  const { id } = req.params;
  const {
    facility_code,
    facility_name,
    date_visited,
    province,
    status,
    remarks,
    mark,
    files_to_keep,
    files_to_delete
  } = req.body;

  // First, get the current record to preserve existing attachments if no file management data is provided
  const getCurrentRecordSql = "SELECT attachment_path FROM test_pdo_visit WHERE id = ?";
  
  db.query(getCurrentRecordSql, [id], (err, currentRecord) => {
    if (err) {
      console.error("Error fetching current record:", err);
      return res.status(500).json({ error: "Failed to fetch current record" });
    }

    if (currentRecord.length === 0) {
      return res.status(404).json({ error: "Facility visit not found" });
    }

    const currentAttachmentPath = currentRecord[0].attachment_path;

    // Parse JSON strings if they exist
    let filesToKeep = [];
    let filesToDelete = [];
    
    try {
      if (files_to_keep) {
        filesToKeep = JSON.parse(files_to_keep);
      }
      if (files_to_delete) {
        filesToDelete = JSON.parse(files_to_delete);
      }
    } catch (error) {
      console.error("Error parsing file management data:", error);
    }

    // Handle new file uploads
    let newFilePaths = [];
    if (req.files && req.files.length > 0) {
      newFilePaths = req.files.map((file) => "uploads/" + file.filename);
    }

    // Determine final attachment paths
    let attachmentPathString;
    
    if (files_to_keep !== undefined || files_to_delete !== undefined || newFilePaths.length > 0) {
      // File management was attempted - use the provided logic
      let finalFilePaths = [...filesToKeep, ...newFilePaths];
      attachmentPathString = finalFilePaths.length > 0 ? finalFilePaths.join(",") : null;
      
      // Delete files marked for deletion
      if (filesToDelete.length > 0) {
        filesToDelete.forEach(filePath => {
          const fullPath = path.join(__dirname, '..', filePath);
          fs.unlink(fullPath, (err) => {
            if (err) {
              console.error(`Error deleting file ${filePath}:`, err);
            } else {
              console.log(`Successfully deleted file: ${filePath}`);
            }
          });
        });
      }
    } else {
      // No file management data provided - preserve existing attachments and add new ones
      let existingPaths = [];
      if (currentAttachmentPath) {
        existingPaths = currentAttachmentPath.split(',');
      }
      
      let allPaths = [...existingPaths, ...newFilePaths];
      attachmentPathString = allPaths.length > 0 ? allPaths.join(",") : null;
    }

    // Update database
    const sql = `
      UPDATE test_pdo_visit 
      SET facility_code=?, facility_name=?, date_visited=?, province=?, status=?, remarks=?, mark=?, attachment_path=?
      WHERE id=?
    `;

    const params = [
      facility_code, 
      facility_name, 
      date_visited, 
      province, 
      status, 
      remarks, 
      mark, 
      attachmentPathString, 
      id
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ error: "Failed to update facility visit" });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Facility visit not found" });
      }
      
      res.json({ 
        message: "Facility visit updated successfully",
        attachments_updated: attachmentPathString ? attachmentPathString.split(',').length : 0,
        files_deleted: filesToDelete.length
      });
    });
  });
});

// 🔹 Delete a facility visit
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM test_pdo_visit WHERE id=?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Failed to delete facility visit" });
    }
    res.json({ message: "Facility visit deleted successfully" });
  });
});

// 🔹 Update facility visit status
router.patch("/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = "UPDATE test_pdo_visit SET status=? WHERE id=?";

  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error("Status update error:", err);
      return res.status(500).json({ error: "Failed to update status" });
    }
    res.json({ message: "Status updated successfully" });
  });
});

// 🔹 Get facility status count
router.get("/facility-status-count", (req, res) => {
  const { date_from, date_to } = req.query;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const defaultFrom = new Date(year, month, 1).toISOString().split("T")[0];
  const defaultTo = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const fromDate = date_from || defaultFrom;
  const toDate = date_to || defaultTo;

  const sql = `
    SELECT
      SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = '0' THEN 1 ELSE 0 END) AS inactive,
      SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) AS closed
    FROM test_pdo_visit
    WHERE date_visited BETWEEN ? AND ?
  `;

  db.query(sql, [fromDate, toDate], (err, results) => {
    if (err) {
      console.error("Status count error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results[0]);
  });
});

// 🔹 Get facilities by status and date range
router.get("/facilities-by-status/:status", (req, res) => {
  const { status } = req.params;
  const { startDate, endDate } = req.query;

  let sql = `
    SELECT 
      facility_code,
      facility_name,
      date_visited,
      province
    FROM test_pdo_visit
    WHERE status = ?
  `;

  const params = [status];

  if (startDate && endDate) {
    sql += " AND date_visited BETWEEN ? AND ?";
    params.push(startDate, endDate);
  } else if (startDate) {
    sql += " AND date_visited >= ?";
    params.push(startDate);
  } else if (endDate) {
    sql += " AND date_visited <= ?";
    params.push(endDate);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Facility filter error:", err);
      return res.status(500).json({ error: "Failed to retrieve facilities" });
    }
    res.json(results);
  });
});

module.exports = router;