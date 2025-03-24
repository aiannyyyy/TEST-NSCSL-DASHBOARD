const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    let { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ error: "Year and month are required." });
    }

    const db = req.app.locals.oracleDb;
    if (!db) {
        return res.status(500).json({ error: "Oracle connection is not initialized." });
    }

    const monthMap = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12"
    };

    month = month.toLowerCase().trim();
    if (!monthMap[month]) {
        return res.status(400).json({ error: "Invalid month. Use full month name (e.g., 'January')." });
    }

    month = monthMap[month];
    const startDate = `${year}-${month}-01 00:00:00`;

    let nextYear = parseInt(year);
    let nextMonth = parseInt(month) + 1;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
    }
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01 00:00:00`;

    try {
        console.log(`📡 Fetching data for ${year}-${month}...`);

        const query = `
            SELECT 
                TO_CHAR(DTRECV, 'YYYY-MM-DD') AS RECEIVED_DATE, 
                COUNT(*) AS TOTAL_SAMPLES
            FROM 
                PHMSDS.SAMPLE_DEMOG_ARCHIVE
            WHERE 
                DTRECV >= TO_TIMESTAMP(:start_date, 'YYYY-MM-DD HH24:MI:SS')
                AND DTRECV < TO_TIMESTAMP(:next_month_start, 'YYYY-MM-DD HH24:MI:SS')
            GROUP BY 
                TO_CHAR(DTRECV, 'YYYY-MM-DD')
            ORDER BY 
                RECEIVED_DATE
        `;

        const result = await db.execute(
            query,
            { start_date: startDate, next_month_start: nextMonthStart },
            { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (error) {
        console.error("❌ Oracle query error:", error.message);
        res.status(500).json({ error: "Database query failed", details: error.message });
    }
});

module.exports = router;
