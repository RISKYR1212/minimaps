const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Gunakan node-fetch v2 untuk Node v18 ke bawah

const app = express();
const PORT = 5000;

const FOLDER_ID = '1KCFDCsSPbt9YQC9C58XpHLV4ba7Cdyip';
const API_KEY = 'AIzaSyAxbag1H3t6LCEorrwtzPyaVhSgAzvqgwA'; // Ganti dengan API Key kamu

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://192.168.10.11:5173']
}));


// Mendapatkan daftar file dari Google Drive folder
app.get('/files', async (req, res) => {
  const query = `'${FOLDER_ID}' in parents and (mimeType='application/vnd.google-earth.kml+xml' or name contains '.kmz') and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Gagal mengambil data dari Google Drive' });
    }

    const data = await response.json();
    res.json(data.files || []);
  } catch (err) {
    console.error('Error fetch files:', err);
    res.status(500).json({ error: 'Gagal mengambil data dari Google Drive' });
  }
});

// Mengunduh file berdasarkan ID
app.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Gagal mengunduh file' });
    }

    // Forward stream data ke client
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');

    if (response.body) {
      response.body.pipe(res);
    } else {
      res.status(500).json({ error: 'Tidak ada data untuk diunduh' });
    }
  } catch (err) {
    console.error('Error download:', err);
    res.status(500).json({ error: 'Gagal mengunduh file' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif di http://${require('os').networkInterfaces()['Wi-Fi'][0].address}:${PORT}`);
});


