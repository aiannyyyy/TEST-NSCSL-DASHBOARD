const express = require("express");
const { exec } = require("child_process");

const router = express.Router();

// Define mapping for EXE files
const exeFiles = {
    "neometrics": "\\\\Neo-sl-2021\\msds4\\Toolbar2 - Copy.exe"
};

// Route to execute EXE
router.get("/execute/:ExeName", (req, res) => {
    const ExeName = req.params.ExeName;

    // Check if exeName exists in the mapping
    if (!exeFiles[ExeName]) {
        return res.status(404).json({ error: `No EXE file found with the name ${ExeName}` });
    }

    const exePath = exeFiles[ExeName];

    exec(`"${exePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing ${ExeName}: ${error.message}`);
            return res.status(500).send(`Failed to execute ${ExeName}.`);
        }

        res.json({ message: `${ExeName} executed successfully.` });
    });
});

module.exports = router;
