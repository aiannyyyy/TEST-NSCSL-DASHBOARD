const express = require("express");
const router = express.Router();
const getOracleConnection = require("../config/oracleConnection");
const oracledb = require("oracledb");

router.get("/notebook-details", async (req, res) => {
    const { fname, lname } = req.query;

    if (!fname || !lname) {
        return res.status(400).json({ error: "Missing required query parameters: fname and lname" });
    }

    let connection;

    try {
        connection = await getOracleConnection();

        const query = `
        SELECT
            sd."LABNO", 
            sd."LNAME", 
            sd."FNAME",
            CASE 
                WHEN sn."NOTES" IS NOT NULL THEN TO_CHAR(sn."NOTES")
                ELSE NULL 
            END AS "NOTES",
            sn."LASTMOD", 
            sn."USER_ID", 
            sn."CREATE_DT", 
            sn."CREATETIME"
        FROM
            "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sd
        JOIN
            "PHCMS"."SAMPLE_NOTES_ARCHIVE" sn
        ON
            sd."LABNO" = sn."LABNO"
        WHERE
            LOWER(sd."FNAME") = LOWER(:fname) AND
            LOWER(sd."LNAME") = LOWER(:lname)
        ORDER BY sn."CREATE_DT" DESC
    `;

        const binds = { fname, lname };
        const options = { 
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            // Add these options to help with CLOB handling
            fetchInfo: {
                "NOTES": { type: oracledb.STRING }  // Force CLOB to STRING
            },
            maxRows: 1000 // Add a reasonable limit
        };
        
        const result = await connection.execute(query, binds, options);

        // 🔒 Log only what is safe
        console.log(`✅ Fetched ${result.rows.length} notebook entries for: ${fname} ${lname}`);

        // ✅ ROBUST SOLUTION: Manual field extraction to avoid circular references
        const cleanData = result.rows.map(row => {
            const cleanRow = {};
            
            // Extract each field safely
            const fields = ['LABNO', 'LNAME', 'FNAME', 'NOTES', 'LASTMOD', 'USER_ID', 'CREATE_DT', 'CREATETIME'];
            
            fields.forEach(field => {
                const value = row[field];
                
                if (value === null || value === undefined) {
                    cleanRow[field] = value;
                } else if (value instanceof Date) {
                    cleanRow[field] = value.toISOString();
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    cleanRow[field] = value;
                } else if (Buffer.isBuffer(value)) {
                    // Handle Oracle CLOB/BLOB data
                    cleanRow[field] = value.toString('utf8');
                } else if (value && typeof value === 'object') {
                    // Handle Oracle CLOB objects specifically
                    if (value.getData && typeof value.getData === 'function') {
                        // Oracle CLOB with getData method
                        cleanRow[field] = value.getData();
                    } else if (value.toString && typeof value.toString === 'function' && value.toString() !== '[object Object]') {
                        // Has a meaningful toString method
                        cleanRow[field] = value.toString();
                    } else if (value.val !== undefined) {
                        // Oracle might store the actual value in a 'val' property
                        cleanRow[field] = value.val;
                    } else if (value.data !== undefined) {
                        // Or in a 'data' property
                        cleanRow[field] = value.data;
                    } else {
                        // Last resort: try to extract readable content
                        cleanRow[field] = JSON.stringify(value);
                    }
                } else {
                    // For any other types, convert to string
                    cleanRow[field] = String(value);
                }
            });
            
            return cleanRow;
        });

        res.json({ data: cleanData });

    } catch (error) {
        // 🔒 Avoid logging the full Oracle error object
        console.error("❌ Query Error:", error.message);
        
        // Enhanced error handling for different error types
        if (error.message.includes('circular structure')) {
            res.status(500).json({ 
                error: "Data serialization error", 
                details: "Unable to process database results" 
            });
        } else if (error.errorNum) {
            // Oracle-specific error
            res.status(500).json({ 
                error: "Database Error", 
                details: `Oracle Error ${error.errorNum}: ${error.message}` 
            });
        } else {
            res.status(500).json({ 
                error: "Internal Server Error", 
                details: error.message 
            });
        }
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error("❌ Failed to close Oracle connection:", closeErr.message);
            }
        }
    }
});

// 🚀 ROBUST: Helper function for cleaning Oracle results
function cleanOracleResult(oracleRows) {
    return oracleRows.map(row => {
        const cleanRow = {};
        
        // Get all enumerable properties from the row
        for (const key in row) {
            if (row.hasOwnProperty(key)) {
                const value = row[key];
                
                if (value === null || value === undefined) {
                    cleanRow[key] = value;
                } else if (value instanceof Date) {
                    cleanRow[key] = value.toISOString();
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    cleanRow[key] = value;
                } else if (Buffer.isBuffer(value)) {
                    // Handle Oracle CLOB/BLOB data
                    cleanRow[key] = value.toString('utf8');
                } else if (value && typeof value.toString === 'function') {
                    // For Oracle-specific types, convert to string
                    cleanRow[key] = value.toString();
                } else {
                    // Skip complex objects that can't be serialized
                    cleanRow[key] = '[Object]';
                }
            }
        }
        
        return cleanRow;
    });
}

// Alternative endpoint using the helper function
router.get("/notebook-details-v2", async (req, res) => {
    const { fname, lname } = req.query;

    if (!fname || !lname) {
        return res.status(400).json({ error: "Missing required query parameters: fname and lname" });
    }

    let connection;

    try {
        connection = await getOracleConnection();

        const query = `
            SELECT
                sd."LABNO", 
                sd."LNAME", 
                sd."FNAME",
                sn."NOTES", 
                sn."LASTMOD", 
                sn."USER_ID", 
                sn."CREATE_DT", 
                sn."CREATETIME"
            FROM
                "PHMSDS"."SAMPLE_DEMOG_ARCHIVE" sd
            JOIN
                "PHCMS"."SAMPLE_NOTES_ARCHIVE" sn
            ON
                sd."LABNO" = sn."LABNO"
            WHERE
                LOWER(sd."FNAME") = LOWER(:fname) AND
                LOWER(sd."LNAME") = LOWER(:lname)
        `;

        const binds = { fname, lname };
        const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
        const result = await connection.execute(query, binds, options);

        console.log(`✅ Fetched ${result.rows.length} notebook entries for: ${fname} ${lname}`);

        // Use the helper function
        const cleanData = cleanOracleResult(result.rows);
        res.json({ data: cleanData });

    } catch (error) {
        console.error("❌ Query Error:", error.message);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error("❌ Failed to close Oracle connection:", closeErr.message);
            }
        }
    }
});

module.exports = router;