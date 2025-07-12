import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logoURL from "../assets/logo-jlm.jpeg";
import axios from "axios";
import {
  Container, Row, Col, Form, Button, Card, Image
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

const resizeImage = (file, max = 600, q = 0.8) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const scale = max / Math.max(img.width, img.height);
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", q));
    };
    img.onerror = () => reject("Gagal memuat gambar");
    img.src = reader.result;
  };
  reader.onerror = () => reject("Gagal membaca file gambar");
  reader.readAsDataURL(file);
});

function Fasfield() {
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    tanggal: "", hari: "", wilayah: "", area: "", keterangan: "",
    temuanList: [blankTemuan()], filename: "patroli"
  });

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
    const safeTemuan = form.temuanList.map(({ foto, ...r }) => r);
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
      try {
        const thumb = await resizeImage(file);
        setForm((p) => {
          const l = [...p.temuanList];
          l[i] = {
            ...l[i],
            foto: file,
            fotoThumb: thumb,
            koordinat,
            statusGPS: "✅ Lokasi berhasil diambil"
          };
          return { ...p, temuanList: l };
        });
      } catch (err) {
        console.error("Gagal proses gambar:", err);
        alert("❌ Gagal memproses gambar. Silakan coba lagi.");
      }
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
    <Container className="p-4">
      <h2 className="text-center mb-4">Form Patroli Fasfield</h2>
      <Form>
        <Row className="g-3 mb-4">
          <Col md={4}><Form.Control type="date" name="tanggal" value={form.tanggal} onChange={rootChange} /></Col>
          <Col md={2}><Form.Control readOnly value={form.hari} /></Col>
          <Col md={3}><Form.Control placeholder="Wilayah" name="wilayah" value={form.wilayah} onChange={rootChange} /></Col>
          <Col md={3}><Form.Control placeholder="Area" name="area" value={form.area} onChange={rootChange} /></Col>
          <Col><Form.Control placeholder="Keterangan" name="keterangan" value={form.keterangan} onChange={rootChange} /></Col>
        </Row>

        {form.temuanList.map((temuan, i) => (
          <Card key={i} className="mb-4 shadow-sm">
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Deskripsi</Form.Label>
                    <Form.Control value={temuan.deskripsi} onChange={(e) => updateTemuan(i, "deskripsi", e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Tindakan</Form.Label>
                    <Form.Control value={temuan.tindakan} onChange={(e) => updateTemuan(i, "tindakan", e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Hasil</Form.Label>
                    <Form.Control value={temuan.hasil} onChange={(e) => updateTemuan(i, "hasil", e.target.value)} />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mt-3">
                <Col md={6} className="d-flex align-items-center gap-2">
                  <Button variant="primary" onClick={() => ambilFoto(i, true)}>Ambil Foto</Button>
                  <Button variant="secondary" onClick={() => ambilFoto(i, false)}>Dari Galeri</Button>
                </Col>
                <Col md={6} className="text-end">
                  {temuan.fotoThumb && <Image src={temuan.fotoThumb} thumbnail style={{ maxHeight: 120 }} />}
                  <div className="text-muted small">{temuan.statusGPS}</div>
                </Col>
              </Row>
              <div className="text-end mt-3">
                <Button variant="danger" onClick={() => removeTemuan(i)} disabled={form.temuanList.length === 1}>Hapus Temuan</Button>
              </div>
            </Card.Body>
          </Card>
        ))}

        <div className="text-center mb-4">
          <Button variant="success" onClick={addTemuan}>+ Tambah Temuan</Button>
        </div>

        <Row>
          <Col><Button onClick={submitToSheet} className="w-100">Kirim ke Google Sheets</Button></Col>
          <Col><Button variant="secondary" onClick={generatePDF} className="w-100">Download PDF</Button></Col>
        </Row>
      </Form>
    </Container>
  );
}

export default Fasfield;
