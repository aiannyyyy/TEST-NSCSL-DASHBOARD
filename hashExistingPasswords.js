const bcrypt = require("bcrypt");
const db = require("./config/mysqlConnection");

const updatePasswords = async () => {
    const selectUsersQuery = "SELECT user_id, password FROM user"; // Adjust based on your schema
    db.query(selectUsersQuery, async (err, users) => {
        if (err) {
            console.error("❌ Error fetching users:", err);
            return;
        }

        for (let user of users) {
            if (user.password.length < 20) { // If password is NOT hashed (bcrypt hashes are usually 60+ chars)
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const updateQuery = "UPDATE user SET password = ? WHERE user_id = ?";
                db.query(updateQuery, [hashedPassword, user.id], (err, result) => {
                    if (err) {
                        console.error(`❌ Error updating password for user ${user.id}:`, err);
                    } else {
                        console.log(`✅ Password updated for user ${user.id}`);
                    }
                });
            }
        }
    });
};

updatePasswords();