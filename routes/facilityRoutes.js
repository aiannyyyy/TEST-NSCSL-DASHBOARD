const express = require("express");
const router = express.Router();
const db = require("../config/mysqlConnection"); // ✅ Correct

// 🔹 Get all facility visits
router.get("/", (req, res) => {
    db.query("SELECT * FROM pdo_visit", (err, results) => {
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
    const sql = "INSERT INTO pdo_visit (facility_code, facility_name, date_visited, province, status, remarks, mark) VALUES (?, ?, ?, ?, ?, ?, ?)";

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
    const sql = "UPDATE pdo_visit SET facility_code=?, facility_name=?, date_visited=?, province=?, status=?, remarks=?, mark=? WHERE id=?";

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
    const sql = "DELETE FROM pdo_visit WHERE id=?";

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
    const sql = "UPDATE pdo_visit SET status=? WHERE id=?";

    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Status update error:", err);
            return res.status(500).json({ error: "Failed to update status" });
        }
        res.json({ message: "Status updated successfully" });
    });
});

// 🔹 Get facility visit status counts (Fixed Route Path)
router.get("/facility-status-count", (req, res) => {
    const sql = `
        SELECT 
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS inactive,
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS closed
        FROM pdo_visit
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Status count error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results[0]); // Return the count object
    });
});

module.exports = router;