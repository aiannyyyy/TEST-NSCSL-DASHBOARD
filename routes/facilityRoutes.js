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

/*
// 🔹 Get facility visit status counts (Fixed Route Path)
router.get("/facility-status-count", (req, res) => {
    const sql = `
        SELECT 
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS inactive,
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS closed
        FROM test_pdo_visit
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Status count error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results[0]); // Return the count object
    });
});
*/
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

/*
// 🔹 Get facilities by status (e.g. active, inactive, closed)
router.get("/facilities-by-status/:status", (req, res) => {
    const { status } = req.params;
    const sql = `
        SELECT 
            facility_code,
            facility_name,
            date_visited,
            province
        FROM test_pdo_visit
        WHERE status = ?
    `;

    db.query(sql, [status], (err, results) => {
        if (err) {
            console.error("Error fetching facilities by status:", err);
            return res.status(500).json({ error: "Failed to retrieve facilities" });
        }
        res.json(results);
    });
});

*/
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


/*
router.get("/filter", (req, res) => {
    let { date_from, date_to } = req.query;

    // If no date range provided, default to current month's range
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];

    date_from = date_from || firstDay;
    date_to = date_to || lastDay;

    const sql = `
        SELECT * FROM test_pdo_visit
        WHERE date_visited BETWEEN ? AND ?
    `;

    db.query(sql, [date_from, date_to], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        res.json(results);
    });
});

*/

module.exports = router;