const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const router = express.Router();

// Define a mapping of valid EXE files
const exeFiles = {
    "daily1": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Filter Card Usage Report\\Filter Card Usage Report.exe",
    "daily2": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\NSF Performance Report\\NSF Performance Report.exe",
    "daily3": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Data Result Tracking System\\Result_tracking_system2.exe",
    "daily4": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Sample Per Province\\Sample Screened Per Province.exe",
    "monthly1": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\nscsl menu for pdo1.exe",
    "monthly2": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Reports to NSRC\\NSRCReports.exe",
    "monthly3": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\for FUN\\TotalSampleBySpectype.exe",
    "monthly4": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Lopez Samples Received\\Lopez-Sample-Receipt.exe",
    "monthly5": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Total Samples Received\\TotalSamples.exe",
    "monthly6": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\TRANSIT TIME-AOS-AOC\\TTime-AOC-AOS.exe",
    "yearly1": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Reports to NSRC\\NSRCReports.exe",
    "yearly2": "\\\\Neo-sl-2021\\msds4\\NSCSL Reprts\\Total Samples Received\\TotalSamples.exe",
};

// Route to execute the EXE file dynamically
router.get("/run-exe/:exeName", (req, res) => {
    const exeName = req.params.exeName;

    // Check if exeName exists in the mapping
    if (!exeFiles[exeName]) {
        return res.status(400).send("Invalid EXE name.");
    }

    const exePath = exeFiles[exeName];

    exec(`"${exePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing ${exeName}: ${error.message}`);
            return res.status(500).send(`Failed to execute ${exeName}.`);
        }
        //console.log(`Executed: ${exeName}`);
        //res.send(`Executed: ${exeName}`);
    });
});

module.exports = router;
