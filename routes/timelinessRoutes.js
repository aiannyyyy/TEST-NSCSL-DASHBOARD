const express = require("express");
const router = express.Router();
const oracleDb = require("oracledb");

// Timeliness Route
router.get("/", async (req, res) => {
    try {
        const connection = req.app.locals.oracleDb;
        if (!connection) {
            return res.status(500).json({ error: "Oracle connection is not initialized" });
        }

        const { year1, year2, month } = req.query;
        if (!year1 || !year2 || !month) {
            return res.status(400).json({ error: "Missing 'year1', 'year2', or 'month' parameters" });
        }

        console.log(`🔍 Fetching timeliness data for ${month} ${year1} and ${year2}`);

        // Month mapping
        const monthMapping = {
            "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
            "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
            "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
        };
        const monthNum = monthMapping[month];

        // Oracle SQL Query for both years
        const query = `
        SELECT 
            ROUND(AVG(sda.DTRECV - sda.DTCOLL), 2) AS transit_ave,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sda.DTRECV - sda.DTCOLL), 2) AS transit_med,
            ROUND(PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY sda.DTRECV - sda.DTCOLL), 2) AS transit_mod
        FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
        WHERE TO_CHAR(sda.DTRECV, 'YYYY') = :year AND TO_CHAR(sda.DTRECV, 'MM') = :monthNum`;

        const result1 = await connection.execute(query, { year: year1, monthNum }, { outFormat: oracleDb.OUT_FORMAT_OBJECT });
        const result2 = await connection.execute(query, { year: year2, monthNum }, { outFormat: oracleDb.OUT_FORMAT_OBJECT });

        const responseData = {
            [`transit_ave_${year1}`]: result1.rows[0]?.TRANSIT_AVE || "N/A",
            [`transit_ave_${year2}`]: result2.rows[0]?.TRANSIT_AVE || "N/A",
            [`transit_med_${year1}`]: result1.rows[0]?.TRANSIT_MED || "N/A",
            [`transit_med_${year2}`]: result2.rows[0]?.TRANSIT_MED || "N/A",
        };

        res.json(responseData);
    } catch (err) {
        console.error("❌ Database error:", err.message, err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

module.exports = router;
