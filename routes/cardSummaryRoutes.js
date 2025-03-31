const express = require("express");
const router = express.Router();

// ✅ Route to Get Summary Data
router.get("/", async (req, res) => {
    try {
        const oracleDb = req.app.locals.oracleDb; // ✅ Get Oracle connection

        if (!oracleDb) {
            return res.status(500).json({ error: "OracleDB is not connected" });
        }

        // ✅ Queries for Each Category (Dynamic Month Range)
        const queries = {
            received: `
                SELECT COUNT(*) AS total_received
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN ('5', '4', '3', '20', '2', '87')
                AND DTRECV BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)
            `,
            screened: `
                SELECT COUNT(*) AS total_screened
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE
                WHERE SPECTYPE IN ('4', '3', '20', '2', '87') -- ✅ Ensure this logic is correct
                AND DTRECV BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)
            `,
            unsatisfactory: `
                SELECT COUNT(DISTINCT sda.LABNO) AS total_unsat
                FROM PHMSDS.SAMPLE_DEMOG_ARCHIVE sda
                JOIN PHMSDS.RESULT_ARCHIVE ra 
                ON sda.LABNO = ra.LABNO
                WHERE ra.MNEMONIC IN ('DE', 'INS', 'E101', 'E100', 'E102', 'E103', 'E107', 'E109', 'UD', 'ODC', 'NDE', 'NE', 'E108')
                AND DTRECV BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)
            `
        };

        // ✅ Execute Queries
        const receivedResult = await oracleDb.execute(queries.received);
        const screenedResult = await oracleDb.execute(queries.screened);
        const unsatResult = await oracleDb.execute(queries.unsatisfactory);

        // ✅ Get Values
        const totalReceived = receivedResult.rows[0][0];
        const totalScreened = screenedResult.rows[0][0];
        const totalUnsat = unsatResult.rows[0][0];

        // ✅ Send JSON Response
        res.json({
            received: totalReceived,
            screened: totalScreened,
            unsat: totalUnsat,
        });

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// ✅ Export Router
module.exports = router;
