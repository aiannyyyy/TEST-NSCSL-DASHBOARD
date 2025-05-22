const express = require("express");
const router = express.Router();
const db = require("../config/mysqlConnection"); // ✅ Correct

// 🔹 Get all facility visits
router.get("/", (req, res) => {
    db.query("SELECT * FROM pdo_notebook", (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});

// 🔹 Add a new notebook
router.post("/", (req, res) => {
    const { labno, fname, lname, code, facility_name, notes, createDate, techCreate, modDate, techMod } = req.body;
    const sql = "INSERT INTO pdo_notebook (labno, fname, lname, code, facility_name, notes, createDate, techCreate, modDate, techMod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(sql, [ labno, fname, lname, code, facility_name, notes, createDate, techCreate, modDate, techMod ], (err, result) => {
        if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({ error: "Failed to add Notebook" });
        }
        res.json({ message: "Notebook added successfully", id: result.insertId });
    });
});

// 🔹 Update a notebook
router.put("/:noteID", (req, res) => {
    const { noteID } = req.params;
    const { labno, fname, lname, code, facility_name, notes, createDate, techCreate, modDate, techMod } = req.body;
    const sql = "UPDATE pdo_notebook SET labno=?, fname=?, lname=?, code=?, facility_name=?, notes=?, createDate=?, techCreate=?, modDate=?, techMod=? WHERE noteID=?";

    db.query(sql, [labno, fname, lname, code, facility_name, notes, createDate, techCreate, modDate, techMod, noteID], (err, result) => {
        if (err) {
            console.error("Update error:", err);
            return res.status(500).json({ error: "Failed to add Notebook" });
        }
        res.json({ message: "Notebook added successfully" });
    });
});

// 🔹 Delete a notebook
router.delete("/:noteID", (req, res) => {
    const { noteID } = req.params;
    const sql = "DELETE FROM pdo_notebook WHERE noteID=?";

    db.query(sql, [noteID], (err, result) => {
        if (err) {
            console.error("Delete error:", err);
            return res.status(500).json({ error: "Failed to delete notebook" });
        }
        res.json({ message: "Notebook deleted successfully" });
    });
});

module.exports = router;