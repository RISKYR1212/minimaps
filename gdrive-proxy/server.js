const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 5000;

const FOLDER_ID = '1KCFDCsSPbt9YQC9C58XpHLV4ba7Cdyip';
const API_KEY = 'AIzaSyC2RxMT7BR6UYOmn5ZtG3dTS0q7Mm9QUcg';

app.use(cors());
app.get('/files', async (req, res) => {
  const query = `'${FOLDER_ID}' in parents and (mimeType='application/vnd.google-earth.kml+xml' or name contains '.kmz')`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.json(data.files);
  } catch (err) {
    console.error('Error fetch files:', err);
    res.status(500).json({ error: 'Gagal mengambil data dari Google Drive' });
  }
});


app.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await fetch(url);

    if (!response.ok) return res.status(400).json({ error: 'Gagal unduh file' });

    res.setHeader('Content-Type', response.headers.get('content-type'));
    response.body.pipe(res);
  } catch (err) {
    console.error('Error download:', err);
    res.status(500).json({ error: 'Gagal mengunduh file' });
  }
});

app.listen(PORT, () => {
  console.log(` Proxy server aktif di http://localhost:${PORT}`);
});
