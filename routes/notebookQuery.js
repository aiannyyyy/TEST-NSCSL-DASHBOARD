const express = require("express");
const router = express.Router();
const db = require("../config/mysqlConnection");

// 🔹 Get notebook entries by lname and fname
router.get("/", (req, res) => {
    const { lname, fname } = req.query;

    console.log("GET /api/notebook - Fetching notebook entries", { lname, fname });

    let sql = "SELECT * FROM pdo_notebook";
    const params = [];

    if (lname && fname) {
        sql += " WHERE lname = ? AND fname = ?";
        params.push(lname, fname);
    } else if (lname) {
        sql += " WHERE lname = ?";
        params.push(lname);
    } else if (fname) {
        sql += " WHERE fname = ?";
        params.push(fname);
    } 

    sql += " ORDER BY createDate DESC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ 
                error: "Database query failed", 
                details: err.message 
            });
        }

        console.log(`Found ${results.length} notebook entries`);
        res.json(results);
    });
});


// 🔹 Get notebook entries for a specific lab number
router.get("/lab/:labno", (req, res) => {
    const { labno } = req.params;
    console.log(`GET /api/notebook/lab/${labno} - Fetching entries for lab number`);
    
    db.query("SELECT * FROM pdo_notebook WHERE labno = ? ORDER BY createDate DESC", [labno], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ 
                error: "Database query failed", 
                details: err.message 
            });
        }
        
        console.log(`Found ${results.length} entries for lab ${labno}`);
        res.json(results);
    });
});

// 🔹 Add a new notebook entry
router.post("/", (req, res) => {
    console.log("POST /api/notebook - Adding new notebook entry");
    console.log("Request body:", req.body);
    
    const { 
        labno,
        labid,
        fname, 
        lname, 
        code, 
        facility_name, 
        notes, 
        createDate, 
        techCreate, 
        modDate, 
        techMod 
    } = req.body;

    // Validate required fields
    if (!notes || notes.trim() === '') {
        console.error("Validation error: Notes field is required");
        return res.status(400).json({ error: "Notes field is required" });
    }

    if (!labno || !fname || !lname) {
        console.error("Validation error: Missing required patient information");
        return res.status(400).json({ error: "Missing required patient information (labno, fname, lname)" });
    }

    // Prepare data with defaults for optional fields
    const notebookData = {
        labno: labno || '',
        labid: labid || '',
        fname: fname || '',
        lname: lname || '',
        code: code || '',
        facility_name: facility_name || '',
        notes: notes.trim(),
        createDate: createDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
        techCreate: techCreate || 'Unknown',
        modDate: modDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
        techMod: techMod || 'Unknown'
    };

    console.log("Processed notebook data:", notebookData);

    const sql = `INSERT INTO pdo_notebook 
                 (labno, labid, fname, lname, code, facility_name, notes, createDate, techCreate, modDate, techMod) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        notebookData.labno,
        notebookData.labid,
        notebookData.fname,
        notebookData.lname,
        notebookData.code,
        notebookData.facility_name,
        notebookData.notes,
        notebookData.createDate,
        notebookData.techCreate,
        notebookData.modDate,
        notebookData.techMod
    ];

    console.log("SQL:", sql);
    console.log("Values:", values);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({ 
                error: "Failed to add notebook entry", 
                details: err.message,
                sqlError: err.code 
            });
        }
        
        console.log("Notebook entry added successfully, ID:", result.insertId);
        res.status(201).json({ 
            message: "Notebook entry added successfully", 
            id: result.insertId,
            data: notebookData
        });
    });
});

// 🔹 Update a notebook entry
router.put("/:noteID", (req, res) => {
    const { noteID } = req.params;
    console.log(`PUT /api/notebook/${noteID} - Updating notebook entry`);
    
    const { 
        labno, 
        labid,
        fname, 
        lname, 
        code, 
        facility_name, 
        notes, 
        createDate, 
        techCreate, 
        modDate, 
        techMod 
    } = req.body;

    // Validate required fields
    if (!notes || notes.trim() === '') {
        return res.status(400).json({ error: "Notes field is required" });
    }

    const sql = `UPDATE pdo_notebook 
                 SET labno=?, labid=?, fname=?, lname=?, code=?, facility_name=?, notes=?, 
                     createDate=?, techCreate=?, modDate=?, techMod=? 
                 WHERE noteID=?`;

    const values = [
        labno || '',
        labid || '',
        fname || '',
        lname || '',
        code || '',
        facility_name || '',
        notes.trim(),
        createDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
        techCreate || 'Unknown',
        modDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
        techMod || 'Unknown',
        noteID
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Update error:", err);
            return res.status(500).json({ 
                error: "Failed to update notebook entry", 
                details: err.message 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notebook entry not found" });
        }
        
        console.log("Notebook entry updated successfully");
        res.json({ message: "Notebook entry updated successfully" });
    });
});

// 🔹 Delete a notebook entry
router.delete("/:noteID", (req, res) => {
    const { noteID } = req.params;
    console.log(`DELETE /api/notebook/${noteID} - Deleting notebook entry`);
    
    const sql = "DELETE FROM pdo_notebook WHERE noteID=?";

    db.query(sql, [noteID], (err, result) => {
        if (err) {
            console.error("Delete error:", err);
            return res.status(500).json({ 
                error: "Failed to delete notebook entry", 
                details: err.message 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notebook entry not found" });
        }
        
        console.log("Notebook entry deleted successfully");
        res.json({ message: "Notebook entry deleted successfully" });
    });
});

module.exports = router;