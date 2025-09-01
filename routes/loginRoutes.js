/*
const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const bcrypt = require('bcrypt');

// Middleware to check user access based on department
const checkUserAccess = (req, res, next) => {
    const user = req.session?.user;
    
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define HTML files for each department
    const departmentFiles = {
        'Admin': [
            'admin.html'
        ],
        'Program': [
            'index.html',
            'sample_screened.html', 
            'sample_receieve.html',
            'pdo_endorsements.html',
            'nsfperformance.html'
        ],
        'Laboratory': [
            'labindex.html',
            'demographics.html'
        ],
        'Followup': [
            'followup.html'
        ]
    };

    // Define access permissions
    const departmentAccess = {
        'Admin': {
            canEdit: [...departmentFiles.Admin, ],
            readOnly: [...departmentFiles.Program, ...departmentFiles.Laboratory, ...departmentFiles.Followup]
        },
        'Program': {
            canEdit: departmentFiles.Program,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Laboratory, ...departmentFiles.Followup]
        },
        'Laboratory': {
            canEdit: departmentFiles.Laboratory,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Followup]
        },
        'Followup': {
            canEdit: departmentFiles.Followup,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Laboratory]
        }
    };

    const userAccess = departmentAccess[user.dept] || { canEdit: [], readOnly: [] };
    
    // Get current page from request
    const currentPage = req.path.split('/').pop();
    
    // Determine if user has edit access to current page
    const hasEditAccess = userAccess.canEdit.includes(currentPage);
    const hasReadAccess = userAccess.readOnly.includes(currentPage) || hasEditAccess;
    
    if (!hasReadAccess && user.dept !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    req.readOnly = !hasEditAccess;
    res.locals.user = user;
    res.locals.readOnly = req.readOnly;
    res.locals.userAccess = userAccess;
    
    next();
};

// LOGIN ROUTE
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

            let isMatch = false;

            // Check if stored password is plain text (less than 20 chars or doesn't start with $2b$)
            if (user.password.length < 20 || !user.password.startsWith('$2b$')) {
                console.log("🔄 Comparing with plain text password...");
                
                // Compare input password with stored plain text
                if (password === user.password) {
                    isMatch = true;
                    
                    // Hash the plain text password for future storage
                    try {
                        const hashedPassword = await bcrypt.hash(user.password, 10);
                        
                        db.query("UPDATE user SET password = ? WHERE username = ?", [hashedPassword, username], (updateErr) => {
                            if (updateErr) {
                                console.error("❌ Failed to update password hash:", updateErr);
                            } else {
                                console.log("✅ Updated password to hash");
                            }
                        });
                    } catch (hashError) {
                        console.error("❌ Failed to hash password:", hashError);
                        // Continue with login even if hashing fails
                    }
                }
            } else {
                // Compare with hashed password
                console.log("🔄 Comparing with hashed password...");
                isMatch = await bcrypt.compare(password, user.password);
            }

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
            return res.json({
                success: true,
                message: 'Login successful',
                user: userData
            });
        });

    } catch (error) {
        console.error("❌ Unexpected error:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET USER ACCESS INFORMATION
router.get('/user-access', (req, res) => {
    const user = req.session?.user;
    
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define HTML files for each department
    const departmentFiles = {
        'Admin': [
            'admin.html',
            'user-management.html', 
            'reports.html',
            'settings.html',
            'dashboard.html',
            'system-logs.html'
        ],
        'Program': [
            'index.html',
            'program-list.html',
            'program-details.html',
            'program-reports.html',
            'program-dashboard.html'
        ],
        'Laboratory': [
            'labindex.html',
            'lab-results.html',
            'lab-equipment.html',
            'lab-reports.html',
            'lab-dashboard.html',
            'specimen-tracking.html'
        ],
        'Followup': [
            'followup.html',
            'patient-followup.html',
            'followup-reports.html',
            'followup-dashboard.html',
            'appointment-schedule.html'
        ]
    };

    const departmentAccess = {
        'Admin': {
            canEdit: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Laboratory, ...departmentFiles.Followup],
            readOnly: []
        },
        'Program': {
            canEdit: departmentFiles.Program,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Laboratory, ...departmentFiles.Followup]
        },
        'Laboratory': {
            canEdit: departmentFiles.Laboratory,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Followup]
        },
        'Followup': {
            canEdit: departmentFiles.Followup,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Laboratory]
        }
    };

    const userAccess = departmentAccess[user.dept] || { canEdit: [], readOnly: [] };

    res.json({
        user: user,
        permissions: userAccess,
        departmentFiles: departmentFiles,
        currentPage: req.query.page || ''
    });
});

// CHECK SESSION STATUS
router.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false,
            message: 'No active session'
        });
    }
});

// LOGOUT ROUTE
router.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Session destroy error:", err);
                return res.status(500).json({ message: 'Could not log out' });
            }
            
            res.clearCookie('connect.sid'); // Clear session cookie
            console.log("✅ User logged out successfully");
            res.json({ success: true, message: 'Logged out successfully' });
        });
    } else {
        res.json({ success: true, message: 'No active session' });
    }
});

module.exports = router;

*/

const express = require('express');
const router = express.Router();
const db = require('../config/mysqlConnection');
const bcrypt = require('bcrypt');

// Middleware to check user access based on department
const checkUserAccess = (req, res, next) => {
    const user = req.session?.user;
    
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define HTML files for each department
    const departmentFiles = {
        'Admin': [
            'admin.html'
        ],
        'Program': [
            'index.html',
            'sample_screened.html', 
            'sample_receieve.html',
            'pdo_endorsements.html',
            'nsfperformance.html'
        ],
        'Laboratory': [
            'labindex.html',
            'demographics.html'
        ],
        'Followup': [
            'followup.html'
        ]
    };

    // Define access permissions
    const departmentAccess = {
        'Admin': {
            canEdit: [...departmentFiles.Admin, ],
            readOnly: [...departmentFiles.Program, ...departmentFiles.Laboratory, ...departmentFiles.Followup]
        },
        'Program': {
            canEdit: departmentFiles.Program,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Laboratory, ...departmentFiles.Followup]
        },
        'Laboratory': {
            canEdit: departmentFiles.Laboratory,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Followup]
        },
        'Followup': {
            canEdit: departmentFiles.Followup,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Laboratory]
        }
    };

    const userAccess = departmentAccess[user.dept] || { canEdit: [], readOnly: [] };
    
    // Get current page from request
    const currentPage = req.path.split('/').pop();
    
    // Determine if user has edit access to current page
    const hasEditAccess = userAccess.canEdit.includes(currentPage);
    const hasReadAccess = userAccess.readOnly.includes(currentPage) || hasEditAccess;
    
    if (!hasReadAccess && user.dept !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    req.readOnly = !hasEditAccess;
    res.locals.user = user;
    res.locals.readOnly = req.readOnly;
    res.locals.userAccess = userAccess;
    
    next();
};

// LOGIN ROUTE
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

            let isMatch = false;

            // Check if stored password is plain text
            if (user.password.length < 20 || !user.password.startsWith('$2b$')) {
                console.log("🔄 Comparing with plain text password...");
                
                if (password === user.password) {
                    isMatch = true;

                    // Hash password for future logins
                    try {
                        const hashedPassword = await bcrypt.hash(user.password, 10);
                        db.query(
                            "UPDATE user SET password = ? WHERE username = ?",
                            [hashedPassword, username],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error("❌ Failed to update password hash:", updateErr);
                                } else {
                                    console.log("✅ Updated password to hash");
                                }
                            }
                        );
                    } catch (hashError) {
                        console.error("❌ Failed to hash password:", hashError);
                    }
                }
            } else {
                // Compare with hashed password
                console.log("🔄 Comparing with hashed password...");
                isMatch = await bcrypt.compare(password, user.password);
            }

            if (!isMatch) {
                console.log("❌ Incorrect password");
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            // ✅ Now include role in userData
            const userData = {
                id: user.user_id,
                username: user.username,
                name: user.name,
                dept: user.dept,
                position: user.position,
                role: user.role   // <-- Added role here
            };

            if (req.session) {
                req.session.user = userData;
            }

            console.log("✅ Login successful:", userData);
            return res.json({
                success: true,
                message: 'Login successful',
                user: userData
            });
        });

    } catch (error) {
        console.error("❌ Unexpected error:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET USER ACCESS INFORMATION
router.get('/user-access', (req, res) => {
    const user = req.session?.user;
    
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define HTML files for each department
    const departmentFiles = {
        'Admin': [
            'admin.html',
            'user-management.html', 
            'reports.html',
            'settings.html',
            'dashboard.html',
            'system-logs.html'
        ],
        'Program': [
            'index.html',
            'program-list.html',
            'program-details.html',
            'program-reports.html',
            'program-dashboard.html'
        ],
        'Laboratory': [
            'labindex.html',
            'lab-results.html',
            'lab-equipment.html',
            'lab-reports.html',
            'lab-dashboard.html',
            'specimen-tracking.html'
        ],
        'Followup': [
            'followup.html',
            'patient-followup.html',
            'followup-reports.html',
            'followup-dashboard.html',
            'appointment-schedule.html'
        ]
    };

    const departmentAccess = {
        'Admin': {
            canEdit: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Laboratory, ...departmentFiles.Followup],
            readOnly: []
        },
        'Program': {
            canEdit: departmentFiles.Program,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Laboratory, ...departmentFiles.Followup]
        },
        'Laboratory': {
            canEdit: departmentFiles.Laboratory,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Followup]
        },
        'Followup': {
            canEdit: departmentFiles.Followup,
            readOnly: [...departmentFiles.Admin, ...departmentFiles.Program, ...departmentFiles.Laboratory]
        }
    };

    const userAccess = departmentAccess[user.dept] || { canEdit: [], readOnly: [] };

    res.json({
        user: user,
        permissions: userAccess,
        departmentFiles: departmentFiles,
        currentPage: req.query.page || ''
    });
});

// CHECK SESSION STATUS
router.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false,
            message: 'No active session'
        });
    }
});

// LOGOUT ROUTE
router.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Session destroy error:", err);
                return res.status(500).json({ message: 'Could not log out' });
            }
            
            res.clearCookie('connect.sid'); // Clear session cookie
            console.log("✅ User logged out successfully");
            res.json({ success: true, message: 'Logged out successfully' });
        });
    } else {
        res.json({ success: true, message: 'No active session' });
    }
});

module.exports = router;