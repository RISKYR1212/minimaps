// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 5000;

const API_KEY = 'ISI_DENGAN_API_KEY_KAMU';
const FOLDER_ID = 'ISI_DENGAN_FOLDER_ID_GOOGLE_DRIVE';

app.use(cors());

app.get('/files', async (req, res) => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}&fields=files(id,name,mimeType)`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.files) {
      return res.status(500).json({ error: 'Gagal ambil file dari Google Drive' });
    }

    res.json(data.files);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server', detail: err.message });
  }
});

app.get('/file/:id', async (req, res) => {
  const fileId = req.params.id;
  try {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
    const response = await fetch(downloadUrl);
    const buffer = await response.buffer();

    res.set('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Gagal ambil konten file', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
