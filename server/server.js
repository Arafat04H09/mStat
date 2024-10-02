const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Configure CORS
const corsOptions = {
  origin: ["http://localhost:5173"],
};
app.use(cors(corsOptions));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");

    // Create uploads folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Save with timestamp to avoid name conflicts
  },
});

const upload = multer({ storage });

// Endpoint for file uploads
app.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  const uploadedFiles = req.files.map(file => file.originalname);
  res.send(`Uploaded files: ${uploadedFiles.join(", ")}`);
});


// Start the server
app.listen(8080, () => {
  console.log("Server started on port 8080");
});
