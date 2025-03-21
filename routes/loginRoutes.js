const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("🔍 Login Attempt:", username, password);

    const sql = 'SELECT * FROM user WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error("❌ Database Error:", err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log("❌ User not found");
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = results[0];
        console.log("✅ User Found:", user);

        try {
            // 🛠️ Check if the password is not hashed (plain text passwords are usually short)
            if (user.password.length < 20) { 
                console.log("🔄 Detected unhashed password. Hashing now...");

                // ✅ Hash the plain-text password
                const hashedPassword = await bcrypt.hash(password, 10);

                // ✅ Update the database with the hashed password
                const updateSql = "UPDATE user SET password = ? WHERE username = ?";
                db.query(updateSql, [hashedPassword, username], (updateErr, result) => {
                    if (updateErr) {
                        console.error("❌ Error updating password:", updateErr);
                        return res.status(500).json({ message: "Database update error" });
                    }
                    console.log("✅ Password successfully hashed and updated.");
                });

                // ✅ Now compare the newly hashed password
                user.password = hashedPassword;
            }

            console.log("🔒 Stored Hashed Password:", user.password);
            const match = await bcrypt.compare(password, user.password);
            console.log(match ? "✅ Password Matched!" : "❌ Password Incorrect");

            if (!match) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            // ✅ Send only required user data (no password)
            const userData = {
                id: user.user_id,  // Ensure correct column name for ID
                username: user.username,
                name: user.name,
                dept: user.dept,
                position: user.position
            };

            console.log("✅ Login successful!");
            res.json({ success: true, message: 'Login successful', user: userData });

        } catch (error) {
            console.error("❌ Error comparing passwords:", error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });
});

module.exports = router;
