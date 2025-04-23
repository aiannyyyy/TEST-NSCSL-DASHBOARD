const express = require("express");
const router = express.Router();
const db = require("../config/inhouseConnection"); // MySQL connection

router.get("/", (req, res) => {
    const sql = `
        SELECT
            DATE_FORMAT(cust_account21.soa_date, '%Y-%m') AS month,
            SUM(cust_account21.qty) AS total_qty
        FROM
            nscaccount.cust_account2 cust_account21
        WHERE
            cust_account21.amount <> 0
            AND cust_account21.soa_date >= '2014-01-01'
            AND cust_account21.soa_date <= CURDATE()
        GROUP BY
            DATE_FORMAT(cust_account21.soa_date, '%Y-%m')
        ORDER BY
            month ASC;
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
