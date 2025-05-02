const express = require("express");
const router = express.Router();
const db = require("../config/inhouseConnection");

router.get("/", (req, res) => {
    const sql = `
        SELECT
            itemcode, description, stocks_on_hand
        FROM
            inventory.lab_supplies
        WHERE
            itemcode IN (
                'LAB002', 'LAB003', 'LAB008', 'LAB010', 'LAB012',
                'LAB013', 'LAB015', 'LAB034', 'LAB035', 'LAB047',
                'LAB049', 'LAB051', 'LAB052', 'LAB062', 'LAB064',
                'LAB068', 'LAB071', 'LAB073', 'LAB080', 'LAB081',
                'LAB128', 'LAB129', 'LAB130'
            )
        ORDER BY
            itemcode ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ MySQL query error:", err.message);
            return res.status(500).json({ error: "Database query failed" });
        }

        res.json(results);
    });
});

module.exports = router;
