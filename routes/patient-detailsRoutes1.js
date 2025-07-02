//patient-detailsRoutes.js
const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/", async (req, res) => {
  let connection;
  const { labno, labid } = req.query;

  if (!labno || !labid) {
    return res.status(400).json({ error: "Missing labno or labid parameter" });
  }

  try {
    connection = await getOracleConnection();

    const bindParams = { labno, labid };

    const fullQuery = `
    SELECT
    DEMOG."LABNO",
    D."NAME" AS DISORDER_NAME,
    MAX(DR."MNEMONIC") AS "MNEMONIC",
    MAX(DR."DESCR1") AS "DESCR1",
    MAX(DR."DISORDERRESULTTEXT") AS "DISORDERRESULTTEXT",
    MAX(DEMOG."LABID") AS "LABID",
    MAX(DEMOG."LNAME") AS "LNAME",
    MAX(DEMOG."FNAME") AS "FNAME",
    MAX(DEMOG."SPECTYPE") AS "SPECTYPE",
    MAX(DEMOG."RELEASEDT") AS "RELEASEDT",
    MAX(DEMOG."PHYSID") AS "PHYSID",
    MAX(DEMOG."BIRTHDT") AS "BIRTHDT",
    MAX(DEMOG."BIRTHTM") AS "BIRTHTM",
    MAX(DEMOG."DTCOLL") AS "DTCOLL",
    MAX(DEMOG."TMCOLL") AS "TMCOLL",
    MAX(DEMOG."BIRTHWT") AS "BIRTHWT",
    MAX(DEMOG."DTRECV") AS "DTRECV",
    MAX(DEMOG."DTRPTD") AS "DTRPTD",
    MAX(DEMOG."SUBMID") AS "SUBMID",
    MAX(DEMOG."SEX") AS "SEX",
    MAX(DEMOG."TRANSFUS") AS "TRANSFUS",
    MAX(DEMOG."MILKTYPE") AS "MILKTYPE",
    MAX(DEMOG."GESTAGE") AS "GESTAGE",
    MAX(DEMOG."AGECOLL") AS "AGECOLL",
    MAX(DEMOG."CLINSTAT") AS "CLINSTAT",
    MAX(DEMOG."BIRTHHOSP") AS "BIRTHHOSP",
    MAX(NOTES."NOTES") AS "NOTES",
    MAX(REF."DESCR1") AS PROVIDER_DESCR1,
    MAX(DG."NAME") AS GROUP_NAME
  FROM (
    SELECT * FROM PHMSDS.RESULT_ARCHIVE
    UNION ALL
    SELECT * FROM PHMSDS.RESULT_MASTER
  ) R
  JOIN PHMSDS.LIB_DISORDER_RESULT DR ON R."MNEMONIC" = DR."MNEMONIC" AND R."REPTCODE" = DR."REPTCODE"
  JOIN PHMSDS.SAMPLE_DEMOG_ARCHIVE DEMOG ON R."LABNO" = DEMOG."LABNO"
  JOIN PHMSDS.SAMPLE_NOTES NOTES ON DEMOG."LABNO" = NOTES."LABNO"
  JOIN PHMSDS.LIB_DISORDER D ON DR."REPTCODE" = D."REPTCODE"
  JOIN PHMSDS.LIB_DISORDER_GROUP DG ON D."GROUPID" = DG."GROUPID"
  JOIN PHMSDS.REF_PROVIDER_ADDRESS REF ON DEMOG."SUBMID" = REF."PROVIDERID"
  WHERE DEMOG."LABNO" = :labno AND DEMOG."LABID" = :labid
  GROUP BY DEMOG."LABNO", D."NAME"
  ORDER BY DEMOG."LABNO" ASC, DISORDER_NAME ASC
    `;

    const result = await connection.execute(fullQuery, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
});

module.exports = router;
