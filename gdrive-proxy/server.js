const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 5000;

// Ganti dengan folder dan API key kamu
const FOLDER_ID = '1KCFDCsSPbt9YQC9C58XpHLV4ba7Cdyip';
const API_KEY = 'AIzaSyC2RxMT7BR6UYOmn5ZtG3dTS0q7Mm9QUcg';

app.use(cors());

// Endpoint untuk mengambil daftar file dari folder Drive
app.get('/files', async (req, res) => {
  const query = `'${FOLDER_ID}' in parents and (mimeType='application/vnd.google-earth.kml+xml' or name contains '.kmz')`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.files) {
      console.error('Gagal ambil daftar file:', data);
      return res.status(500).json({ error: 'Gagal ambil daftar file dari Google Drive' });
    }

    res.json(data.files);
  } catch (err) {
    console.error('Error fetch files:', err);
    res.status(500).json({ error: 'Gagal mengambil data dari Google Drive' });
  }
});

// Endpoint untuk mengunduh file berdasarkan ID (menggunakan Google Drive API resmi)
app.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Gagal unduh file ${fileId}, status: ${response.status}`);
      return res.status(400).json({ error: 'Gagal unduh file dari Google Drive' });
    }

    res.setHeader('Content-Type', response.headers.get('content-type'));
    response.body.pipe(res);
  } catch (err) {
    console.error('Error saat mengunduh file:', err);
    res.status(500).json({ error: 'Gagal mengunduh file dari Google Drive' });
  }
});

app.listen(PORT, () => {
  console.log(` Proxy server aktif di http://localhost:${PORT}`);
});
