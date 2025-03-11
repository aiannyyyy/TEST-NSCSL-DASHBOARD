const express = require("express");
const router = express.Router();
const db = require("../config/oracleConnection"); // ✅ Correct

router.get("/some-query", async (req, res) => {
  try {
    const db = await connectOracle();
    const result = await db.execute("SELECT * FROM phmsds.sample_demog_archive WHERE ROWNUM <= 10");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Oracle query failed", details: err.message });
  }
});

module.exports = router;
