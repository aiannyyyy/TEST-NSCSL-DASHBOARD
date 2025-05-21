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
      SELECT * FROM (
        SELECT
          DR."MNEMONIC",
          DR."DESCR1",
          DR."DISORDERRESULTTEXT",
          DEMOG."LABNO",
          DEMOG."LABID",
          DEMOG."LNAME",
          DEMOG."FNAME",
          DEMOG."SPECTYPE",
          DEMOG."RELEASEDT",
          DEMOG."PHYSID",
          DEMOG."BIRTHDT",
          DEMOG."BIRTHTM",
          DEMOG."DTCOLL",
          DEMOG."TMCOLL",
          DEMOG."BIRTHWT",
          DEMOG."DTRECV",
          DEMOG."DTRPTD",
          DEMOG."SUBMID",
          DEMOG."SEX",
          DEMOG."TRANSFUS",
          DEMOG."MILKTYPE",
          DEMOG."GESTAGE",
          DEMOG."AGECOLL",
          DEMOG."CLINSTAT",
          DEMOG."BIRTHHOSP",
          NOTES."NOTES",
          D."NAME" AS DISORDER_NAME,
          REF."DESCR1" AS PROVIDER_DESCR1,
          DG."NAME" AS GROUP_NAME
        FROM PHMSDS.RESULT_ARCHIVE R
        JOIN PHMSDS.LIB_DISORDER_RESULT DR ON R."MNEMONIC" = DR."MNEMONIC" AND R."REPTCODE" = DR."REPTCODE"
        JOIN PHMSDS.SAMPLE_DEMOG_ARCHIVE DEMOG ON R."LABNO" = DEMOG."LABNO"
        JOIN PHMSDS.SAMPLE_NOTES NOTES ON DEMOG."LABNO" = NOTES."LABNO"
        JOIN PHMSDS.LIB_DISORDER D ON DR."REPTCODE" = D."REPTCODE"
        JOIN PHMSDS.LIB_DISORDER_GROUP DG ON D."GROUPID" = DG."GROUPID"
        JOIN PHMSDS.REF_PROVIDER_ADDRESS REF ON DEMOG."SUBMID" = REF."PROVIDERID"
        WHERE DEMOG."LABNO" = :labno AND DEMOG."LABID" = :labid

        UNION ALL

        SELECT
          DR."MNEMONIC",
          DR."DESCR1",
          DR."DISORDERRESULTTEXT",
          DEMOG."LABNO",
          DEMOG."LABID",
          DEMOG."LNAME",
          DEMOG."FNAME",
          DEMOG."SPECTYPE",
          DEMOG."RELEASEDT",
          DEMOG."PHYSID",
          DEMOG."BIRTHDT",
          DEMOG."BIRTHTM",
          DEMOG."DTCOLL",
          DEMOG."TMCOLL",
          DEMOG."BIRTHWT",
          DEMOG."DTRECV",
          DEMOG."DTRPTD",
          DEMOG."SUBMID",
          DEMOG."SEX",
          DEMOG."TRANSFUS",
          DEMOG."MILKTYPE",
          DEMOG."GESTAGE",
          DEMOG."AGECOLL",
          DEMOG."CLINSTAT",
          DEMOG."BIRTHHOSP",
          NOTES."NOTES",
          D."NAME" AS DISORDER_NAME,
          REF."DESCR1" AS PROVIDER_DESCR1,
          DG."NAME" AS GROUP_NAME
        FROM PHMSDS.RESULT_MASTER R
        JOIN PHMSDS.LIB_DISORDER_RESULT DR ON R."MNEMONIC" = DR."MNEMONIC" AND R."REPTCODE" = DR."REPTCODE"
        JOIN PHMSDS.SAMPLE_DEMOG_MASTER DEMOG ON R."LABNO" = DEMOG."LABNO"
        JOIN PHMSDS.SAMPLE_NOTES NOTES ON DEMOG."LABNO" = NOTES."LABNO"
        JOIN PHMSDS.LIB_DISORDER D ON DR."REPTCODE" = D."REPTCODE"
        JOIN PHMSDS.LIB_DISORDER_GROUP DG ON D."GROUPID" = DG."GROUPID"
        JOIN PHMSDS.REF_PROVIDER_ADDRESS REF ON DEMOG."SUBMID" = REF."PROVIDERID"
        WHERE DEMOG."LABNO" = :labno AND DEMOG."LABID" = :labid
      )
      ORDER BY "LABNO" ASC, "GROUP_NAME" ASC
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
