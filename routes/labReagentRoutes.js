const express = require("express");
const router = express.Router();
const db = require("../config/inhouseConnection");

router.get("/", (req, res) => {
    const sql = `
        SELECT
            itemcode, description, stocks_on_hand
        FROM
            inventory.reagents
        WHERE
            itemcode IN (
                'REA005', 'REA006', 'REA007', 'REA008', 'REA019',
                'REA025', 'REA028', 'REA029', 'REA030', 'REA031',
                'REA032', 'REA033', 'REA036', 'REA051', 'REA052',
                'REA053', 'REA054', 'REA057'
            )
        ORDER BY
            itemcode ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ MySQL query error:", err.message);
            return res.status(500).json({ error: "Database query failed" });
        }

        // Ensure stocks_on_hand is properly formatted as a number
        const formattedResults = results.map(item => ({
            ...item,
            stocks_on_hand: Number(item.stocks_on_hand) // Ensure it's a number
        }));

        res.json(formattedResults);
    });
});

module.exports = router;