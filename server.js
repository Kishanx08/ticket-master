const express = require("express");
const app = express();
const port = process.env.PORT || 3000; // ✅ required by Replit

app.get("/", (req, res) => {
    res.send("✅ Bot is alive");
});

app.listen(port, () => {
    console.log(`🌐 Web server running at http://localhost:${port}`);
});
