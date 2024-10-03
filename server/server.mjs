import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { Storage } from '@google-cloud/storage';

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); 
const storage = new Storage();

// Configure CORS
const corsOptions = {
  origin: ["http://localhost:5173"],
};
app.use(cors(corsOptions));

console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Handle file upload
app.post('/upload', upload.array('files', 10), async (req, res) => { // Accept up to 10 files
  try {
    const email = req.query.email; 
    if (!email) {
      return res.status(400).send('User ID is required.');
    }

    const files = req.files; // Multer stores files in req.files
    if (!files || files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    // Create bucket name (all lowercase)
  const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, ''); // Remove non-alphanumeric characters
  const bucketName = `data-for-user-${sanitizedEmail}`.toLowerCase(); // Ensure the bucket name is lowercase

    const bucket = storage.bucket(bucketName);

    // Check if the bucket exists, create it if it doesn't
    const [bucketExists] = await bucket.exists();
    if (!bucketExists) {
      await bucket.create();
    }

    // Optionally delete existing files in the bucket (for replacement)
    const [existingFiles] = await bucket.getFiles();
    await Promise.all(existingFiles.map(file => file.delete()));

    // Upload each file
    await Promise.all(files.map(file => {
      const blob = bucket.file(file.originalname);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', reject);
        blobStream.on('finish', resolve);
        blobStream.end(file.buffer);
      });
    }));

    // Return success message
    res.status(200).send({ message: 'Files uploaded successfully!' });
  } catch (error) {
    console.error('Error during upload process:', error);
    res.status(500).send('Error during upload process.');
  }
});

// Start the server
app.listen(8080, () => {
  console.log("Server started on port 8080");
});
