const bcrypt = require('bcrypt');
const db = require('./config/mysqlConnection'); // Ensure correct MySQL connection

const username = "admin"; // Change this if needed
const plainPassword = "admin123"; // The real password
const saltRounds = 10;

(async () => {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log("✅ New Hashed Password:", hashedPassword);

        const sql = "UPDATE user SET password = ? WHERE username = ?";
        db.query(sql, [hashedPassword, username], (err, result) => {
            if (err) {
                console.error("❌ Database Error:", err);
                return;
            }
            console.log("✅ Password hashed and updated successfully!");
        });

    } catch (error) {
        console.error("❌ Error hashing password:", error);
    }
})();
