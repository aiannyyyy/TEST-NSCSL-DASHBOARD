const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("🔍 Login Attempt:", username);

    try {
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

            if (!user.password) {
                console.log("❌ Password missing for user");
                return res.status(401).json({ message: 'Invalid login' });
            }

            // If stored password is plain text (e.g. less than 20 characters), hash it
            if (user.password.length < 20) {
                console.log("🔄 Hashing plain password...");
                const hashedPassword = await bcrypt.hash(password, 10);

                db.query("UPDATE user SET password = ? WHERE username = ?", [hashedPassword, username], (updateErr) => {
                    if (updateErr) {
                        console.error("❌ Failed to update password hash:", updateErr);
                        // Proceed without failing login
                    } else {
                        console.log("✅ Updated password to hash");
                    }
                });

                user.password = hashedPassword;
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log("❌ Incorrect password");
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const userData = {
                id: user.user_id,
                username: user.username,
                name: user.name,
                dept: user.dept,
                position: user.position
            };

            if (req.session) {
                req.session.user = userData;
            }

            console.log("✅ Login successful");
            return res.json({ success: true, message: 'Login successful', user: userData });
        });

    } catch (error) {
        console.error("❌ Unexpected error:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
