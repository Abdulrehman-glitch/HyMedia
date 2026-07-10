const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "hymedia-frontend",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`HyMedia frontend running on http://localhost:${PORT}`);
});