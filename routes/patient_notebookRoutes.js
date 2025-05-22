const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/", async (req, res) => {
    let connection;

    try {
        connection = await getOracleConnection();

        const {
            labno,
            labid,
            fname,
            lname,
            submid
        } = req.query;

        const searchParams = [labno, labid, fname, lname, submid].filter(param => param);

        if (searchParams.length === 0) {
            return res.status(400).json({ error: "Please provide at least one search parameter." });
        }

        const conditions = [];
        const binds = {};

        if (labno) {
            conditions.push(`LOWER(SD."LABNO") = :labno`);
            binds.labno = labno.toLowerCase();
        }
        if (labid) {
            conditions.push(`LOWER(SD."LABID") = :labid`);
            binds.labid = labid.toLowerCase();
        }
        if (fname) {
            conditions.push(`LOWER(SD."FNAME") = :fname`);
            binds.fname = fname.toLowerCase();
        }
        if (lname) {
            conditions.push(`LOWER(SD."LNAME") = :lname`);
            binds.lname = lname.toLowerCase();
        }
        if (submid) {
            conditions.push(`LOWER(SD."SUBMID") = :submid`);
            binds.submid = submid.toLowerCase();
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        
     const queryBase = (tableAlias, tableName) => `
        SELECT
            ${tableAlias}."LABNO",
            MAX(${tableAlias}."LABID") AS "LABID",
            MAX(${tableAlias}."FNAME") AS "FNAME",
            MAX(${tableAlias}."LNAME") AS "LNAME",
            MAX(${tableAlias}."SEX") AS "SEX",
            MAX(${tableAlias}."BIRTHDT") AS "BIRTHDT",
            MAX(${tableAlias}."BIRTHWT") AS "BIRTHWT",
            MAX(${tableAlias}."SUBMID") AS "SUBMID",
            MAX(RPA."DESCR1") AS "DESCR1",
            MAX(SN."NOTES") AS "NOTES"
        FROM
            PHMSDS.${tableName} ${tableAlias}
        JOIN PHMSDS.REF_PROVIDER_ADDRESS RPA
            ON ${tableAlias}."SUBMID" = RPA."PROVIDERID"
        JOIN PHMSDS.SAMPLE_NOTES SN
            ON ${tableAlias}."LABNO" = SN."LABNO"
        ${whereClause}
        GROUP BY
            ${tableAlias}."LABNO"
    `;


        const queryArchive = queryBase("SD", "SAMPLE_DEMOG_ARCHIVE");
        const queryMaster = queryBase("SD", "SAMPLE_DEMOG_MASTER");

        const resultArchive = await connection.execute(queryArchive, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const resultMaster = await connection.execute(queryMaster, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const combinedResults = [...resultArchive.rows, ...resultMaster.rows];

        res.status(200).json(combinedResults);

    } catch (error) {
        console.error("Error fetching patient info:", error);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Error closing Oracle connection:", closeError);
            }
        }
    }
});

module.exports = router;
