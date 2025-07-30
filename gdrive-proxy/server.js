require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const cors = require('cors')

app.use(cors({
  origin: "https://core-management.vercel.app",
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



const GOOGLE_API_KEY = 'AIzaSyAxbag1H3t6LCEorrwtzPyaVhSgAzvqgwA';
const GOOGLE_DRIVE_FOLDER_ID = '1KCFDCsSPbt9YQC9C58XpHLV4ba7Cdyip';

console.log("API KEY:", GOOGLE_API_KEY);
console.log("FOLDER ID:", GOOGLE_DRIVE_FOLDER_ID);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Server is running. Endpoint tersedia di /files dan /download/:fileId');
});

// Get list of files from Google Drive folder
app.get('/files', async (req, res) => {
  try {
    const folderId = GOOGLE_DRIVE_FOLDER_ID;
    const apiKey = GOOGLE_API_KEY;

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType)`;

    const response = await axios.get(url);

    const files = response.data.files || [];
    res.json({ files });
  } catch (error) {
    console.error('Gagal mengambil file:', error.message);
    res.status(500).json({ error: 'Gagal mengambil file dari Google Drive' });
  }
});


// Download a file by ID
app.get('/download/:fileId', async (req, res) => {
  const { fileId } = req.params;
  try {
    const fileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

    res.setHeader('Content-Disposition', `attachment; filename="${fileId}.kml"`);
    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.send(response.data);
  } catch (error) {
    console.error('Error downloading file:', error.message);
    res.status(500).json({ error: 'Gagal mengunduh file dari Google Drive' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
