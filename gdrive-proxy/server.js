require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const GOOGLE_API_KEY = 'AIzaSyAxbag1H3t6LCEorrwtzPyaVhSgAzvqgwA';
const GOOGLE_DRIVE_FOLDER_ID = '1KCFDCsSPbt9YQC9C58XpHLV4ba7Cdyip';

app.get('/files', async (req, res) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_DRIVE_FOLDER_ID}'+in+parents&key=${GOOGLE_API_KEY}`
    );
    res.json(response.data.files);
  } catch (error) {
    console.error('Error fetching files from Google Drive:', error.message);
    res.status(500).json({ error: 'Gagal mengambil data dari Google Drive' });
  }
});

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
