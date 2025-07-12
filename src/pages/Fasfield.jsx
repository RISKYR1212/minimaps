import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logoURL from "../assets/logo-jlm.jpeg";
import axios from "axios";
import {
  Container, Row, Col, Form, Button, Card, Table, Image, Modal
} from "react-bootstrap";

const LOCAL_KEY = "fasfield_isp_form_v2";
const PDF_TITLE = "LAPORAN PATROLI";
const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

const blankTemuan = () => ({
  deskripsi: "", tindakan: "", hasil: "",
  foto: null, fotoThumb: "", koordinat: "", statusGPS: ""
});

const ambilGPS = () => new Promise((ok, no) => {
  if (!navigator.geolocation) return no("Geolocation tidak didukung browser");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => ok(`${coords.latitude}, ${coords.longitude}`),
    (err) => no(err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

const resizeImage = (file, max = 600, q = 0.8) => new Promise(ok => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const scale = max / Math.max(img.width, img.height);
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL("image/jpeg", q));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function Fasfield() {
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    tanggal: "", hari: "", wilayah: "", area: "", keterangan: "",
    temuanList: [blankTemuan()], filename: "patroli"
  });
  const [records, setRecords] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setForm({
          ...p,
          temuanList: (p.temuanList || []).map(t => ({ ...blankTemuan(), ...t }))
        });
      } catch {}
    }
    fetchRecords();
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const safeTemuan = form.temuanList.map(({ foto, fotoThumb, ...r }) => r);
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...form, temuanList: safeTemuan }));
  }, [form, loaded]);

  const rootChange = ({ target: { name, value } }) =>
    setForm(p => ({
      ...p,
      [name]: value,
      ...(name === "tanggal" && {
        hari: new Date(value).toLocaleDateString("id-ID", { weekday: "long" })
      })
    }));

  const updateTemuan = (i, k, v) =>
    setForm(p => {
      const l = [...p.temuanList];
      l[i] = { ...l[i], [k]: v };
      return { ...p, temuanList: l };
    });

  const ambilFoto = async (i, capture = false) => {
    let koordinat = "";
    try {
      koordinat = await ambilGPS();
      updateTemuan(i, "statusGPS", "✅ Lokasi berhasil diambil");
    } catch (err) {
      updateTemuan(i, "statusGPS", `❌ Gagal ambil lokasi (${err})`);
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.capture = "environment";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const thumb = await resizeImage(file);
      setForm(p => {
        const l = [...p.temuanList];
        l[i] = { ...l[i], foto: file, fotoThumb: thumb, koordinat };
        return { ...p, temuanList: l };
      });
    };
    input.click();
  };

  const generatePDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.setFontSize(16);
    doc.text(PDF_TITLE, 105, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Tanggal: ${form.tanggal}`, 14, 25);
    doc.text(`Hari: ${form.hari}`, 14, 30);
    doc.text(`Wilayah: ${form.wilayah}`, 14, 35);
    doc.text(`Area: ${form.area}`, 14, 40);
    doc.text(`Keterangan: ${form.keterangan}`, 14, 45);

    let y = 55;
    for (let i = 0; i < form.temuanList.length; i++) {
      const t = form.temuanList[i];
      doc.setFontSize(12);
      doc.text(`Temuan #${i + 1}`, 14, y);
      y += 5;
      doc.setFontSize(10);
      doc.text(`Deskripsi: ${t.deskripsi}`, 14, y); y += 5;
      doc.text(`Tindakan: ${t.tindakan}`, 14, y); y += 5;
      doc.text(`Hasil: ${t.hasil}`, 14, y); y += 5;
      doc.text(`Koordinat: ${t.koordinat}`, 14, y); y += 5;

      if (t.fotoThumb) {
        const width = 60;
        const height = 45;
        try {
          doc.addImage(t.fotoThumb, "JPEG", 14, y, width, height);
          y += height + 5;
        } catch (err) {
          console.warn("❌ Gagal menyisipkan gambar:", err);
          y += 5;
        }
      } else {
        y += 5;
      }
    }

    doc.save(`${form.filename || "laporan"}.pdf`);
  };

  const addTemuan = () => setForm(p => ({ ...p, temuanList: [...p.temuanList, blankTemuan()] }));
  const removeTemuan = i => setForm(p => p.temuanList.length === 1 ? p : { ...p, temuanList: p.temuanList.filter((_, idx) => idx !== i) });

  const submitToSheet = async () => {
    try {
      for (const temuan of form.temuanList) {
        const payload = {
          sheet: "patrolli",
          tanggal: form.tanggal,
          wilayah: form.wilayah,
          area: form.area,
          deskripsi: temuan.deskripsi,
          tindakan: temuan.tindakan,
          hasil: temuan.hasil,
          koordinat: temuan.koordinat
        };
        const res = await axios.post(endpoint, new URLSearchParams(payload));
        if (!res.data.ok) throw new Error(res.data.message);
      }
      alert("✅ Data berhasil dikirim ke Google Sheets!");
      localStorage.removeItem(LOCAL_KEY);
      setForm({ tanggal: "", hari: "", wilayah: "", area: "", keterangan: "", temuanList: [blankTemuan()], filename: "patroli" });
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("❌ Gagal kirim data: " + err.message);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await axios.get(`${endpoint}?sheet=patrolli`);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error("Gagal ambil data:", err);
    }
  };

  return (
    <Container className="my-4">
      <h3 className="text-center mb-4">Laporan Patroli Fasfield</h3>

      <Form>
        <Row className="g-3">
          <Col xs={12} md={6}><Form.Group><Form.Label>Tanggal</Form.Label><Form.Control type="date" name="tanggal" value={form.tanggal} onChange={rootChange} /></Form.Group></Col>
          <Col xs={12} md={6}><Form.Group><Form.Label>Hari</Form.Label><Form.Control readOnly value={form.hari} /></Form.Group></Col>
          <Col xs={12} md={6}><Form.Group><Form.Label>Wilayah</Form.Label><Form.Control name="wilayah" value={form.wilayah} onChange={rootChange} /></Form.Group></Col>
          <Col xs={12} md={6}><Form.Group><Form.Label>Area</Form.Label><Form.Control name="area" value={form.area} onChange={rootChange} /></Form.Group></Col>
        </Row>

        {form.temuanList.map((t, i) => (
          <Card key={i} className="mt-4">
            <Card.Body>
              <Card.Title>Temuan #{i + 1}</Card.Title>
              <Form.Group><Form.Label>Deskripsi</Form.Label><Form.Control as="textarea" rows={2} value={t.deskripsi} onChange={e => updateTemuan(i, "deskripsi", e.target.value)} /></Form.Group>
              <Form.Group><Form.Label>Tindakan</Form.Label><Form.Control as="textarea" rows={2} value={t.tindakan} onChange={e => updateTemuan(i, "tindakan", e.target.value)} /></Form.Group>
              <Form.Group><Form.Label>Hasil</Form.Label>
                <Form.Select value={t.hasil} onChange={e => updateTemuan(i, "hasil", e.target.value)}>
                  <option value="">Pilih Hasil</option>
                  <option>Baik</option>
                  <option>Perlu Perbaikan</option>
                  <option>Darurat</option>
                </Form.Select>
              </Form.Group>
              <Form.Group><Form.Label>Foto & Lokasi</Form.Label><br />
                <div className="d-flex gap-2 flex-wrap">
                  <Button variant="outline-primary" onClick={() => ambilFoto(i, true)}>📷 Kamera</Button>
                  <Button variant="outline-secondary" onClick={() => ambilFoto(i, false)}>🖼 Galeri</Button>
                </div>
                {t.fotoThumb && (
                  <div className="position-relative d-inline-block mt-2">
                    <Image
                      src={t.fotoThumb}
                      thumbnail
                      width={100}
                      onClick={() => setPreviewIndex(i)}
                      style={{ border: "2px solid green", cursor: "pointer" }}
                    />
                    <span className="badge bg-success position-absolute top-0 start-100 translate-middle rounded-pill">✔</span>
                  </div>
                )}
                <div className="mt-2 small text-muted">{t.statusGPS}</div>
              </Form.Group>
              <Form.Group><Form.Label>Koordinat</Form.Label><Form.Control readOnly value={t.koordinat} /></Form.Group>
              {form.temuanList.length > 1 && <Button variant="danger" size="sm" onClick={() => removeTemuan(i)} className="mt-2">Hapus Temuan</Button>}
            </Card.Body>
          </Card>
        ))}

        <div className="mt-3">
          <Button onClick={addTemuan}>+ Tambah Temuan</Button>
        </div>

        <Form.Group className="my-3">
          <Form.Label>Keterangan Umum</Form.Label>
          <Form.Control as="textarea" rows={3} name="keterangan" value={form.keterangan} onChange={rootChange} />
        </Form.Group>

        <div className="d-flex flex-wrap gap-2">
          <Button variant="primary" onClick={submitToSheet}>Kirim ke Sheets</Button>
          <Button variant="success" onClick={generatePDF}>📄 Unduh PDF</Button>
        </div>
      </Form>

      <hr className="my-4" />
      <h5>Data Patroli Sebelumnya</h5>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Wilayah</th>
            <th>Area</th>
            <th>Deskripsi</th>
            <th>Tindakan</th>
            <th>Hasil</th>
            <th>Koordinat</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td colSpan="8" className="text-center">Tidak ada data</td></tr>
          ) : (
            records.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{r.tanggal}</td>
                <td>{r.wilayah}</td>
                <td>{r.area}</td>
                <td>{r.deskripsi}</td>
                <td>{r.tindakan}</td>
                <td>{r.hasil}</td>
                <td>{r.koordinat}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={previewIndex !== null} onHide={() => setPreviewIndex(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Pratinjau Foto Temuan #{previewIndex + 1}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {previewIndex !== null && form.temuanList[previewIndex].fotoThumb && (
            <Image src={form.temuanList[previewIndex].fotoThumb} fluid />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default Fasfield;
