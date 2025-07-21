import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import axios from "axios";
import logoURL from "../assets/logo-jlm.jpeg";
import {
  Container, Row, Col, Form, Button, Card, Image, Modal, Table
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
    const img = document.createElement("img");
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
  const [form, setForm] = useState({
    tanggal: "", wilayah: "", area: "",
    temuanList: [blankTemuan()],
    filename: "patroli",
    _index: null
  });
  const [editMode, setEditMode] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${endpoint}?sheet=patrolli`);
        if (res.data.ok) setData(res.data.records);
      } catch (err) {
        console.error("Gagal mengambil data:", err);
      }
    };
    fetchData();
  }, []);

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
      updateTemuan(i, "statusGPS", ` Gagal ambil lokasi (${err})`);
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
        setPreviewImage({ file, thumb, koordinat });
        setPreviewIndex(i);
      } catch {
        alert(" Gagal memproses gambar.");
      }
    };
    input.click();
  };

  const handleEditTemuan = (row) => {
    setForm({
      tanggal: row.tanggal,
      wilayah: row.wilayah,
      area: row.area,
      temuanList: [{
        deskripsi: row.deskripsi,
        tindakan: row.tindakan,
        hasil: row.hasil,
        foto: null,
        fotoThumb: "",
        koordinat: row.koordinat,
        statusGPS: ""
      }],
      filename: "patroli",
      _index: row._index
    });
    setEditMode(true);
  };

  const generatePDFBlob = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("times", "");

    try {
      const img = new Image();
      img.src = logoURL;
      await new Promise((resolve) => { img.onload = () => resolve(); });
      doc.addImage(img, "JPEG", 88, 10, 35, 20);
    } catch {}

    doc.setFontSize(14);
    doc.text(PDF_TITLE, 105, 35, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Tanggal: ${form.tanggal}`, 14, 50);
    doc.text(`Wilayah: ${form.wilayah}`, 14, 56);
    doc.text(`Area: ${form.area}`, 14, 62);

    let y = 72;
    for (const [i, t] of form.temuanList.entries()) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(13);
      doc.text(`Temuan #${i + 1}`, 14, y);
      y += 6;

      const textX = 14;
      const imageX = 140;
      const textWidth = 90;
      const imageWidth = 50;
      const imageHeight = 45;
      const lineHeight = 6;

      const lines1 = doc.splitTextToSize(`Deskripsi: ${t.deskripsi}`, textWidth);
      const lines2 = doc.splitTextToSize(`Tindakan: ${t.tindakan}`, textWidth);
      const lines3 = doc.splitTextToSize(`Hasil: ${t.hasil}`, textWidth);
      const lines4 = doc.splitTextToSize(`Koordinat: ${t.koordinat}`, textWidth);

      const allLines = [...lines1, ...lines2, ...lines3, ...lines4];
      const totalHeight = allLines.length * lineHeight;

      let currentY = y;
      doc.setFontSize(11);
      doc.text(lines1, textX, currentY); currentY += lines1.length * lineHeight;
      doc.text(lines2, textX, currentY); currentY += lines2.length * lineHeight;
      doc.text(lines3, textX, currentY); currentY += lines3.length * lineHeight;
      doc.text(lines4, textX, currentY); currentY += lines4.length * lineHeight;

      if (t.fotoThumb) {
        try {
          doc.addImage(t.fotoThumb, "JPEG", imageX, y, imageWidth, imageHeight);
        } catch {
          doc.text("Gagal tampilkan gambar", imageX, y);
        }
      }

      y += Math.max(totalHeight, imageHeight) + 10;
    }

    return doc.output("blob");
  };

  return (
    <Container className="py-3">
      <h4 className="text-center mb-3">Laporan Patroli</h4>

      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Control type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control placeholder="Wilayah" value={form.wilayah} onChange={e => setForm({ ...form, wilayah: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control placeholder="Area" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
            </Form.Group>
            {form.temuanList.map((t, i) => (
              <Card key={i} className="mb-3">
                <Card.Body>
                  <Form.Group className="mb-2">
                    <Form.Control placeholder="Deskripsi" value={t.deskripsi} onChange={(e) => updateTemuan(i, "deskripsi", e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control placeholder="Tindakan" value={t.tindakan} onChange={(e) => updateTemuan(i, "tindakan", e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control placeholder="Hasil" value={t.hasil} onChange={(e) => updateTemuan(i, "hasil", e.target.value)} />
                  </Form.Group>
                  <div className="d-flex gap-2 mb-2">
                    <Button size="sm" onClick={() => ambilFoto(i, true)}>📷 Kamera</Button>
                    <Button size="sm" variant="secondary" onClick={() => ambilFoto(i, false)}>🖼️ Galeri</Button>
                  </div>
                  {t.fotoThumb && <Image src={t.fotoThumb} thumbnail className="mb-2" style={{ maxWidth: "100%" }} />}
                  <div className="text-muted small mb-2">{t.statusGPS}</div>
                </Card.Body>
              </Card>
            ))}
            <Button onClick={() => setForm(p => ({ ...p, temuanList: [...p.temuanList, blankTemuan()] }))}>+ Tambah Temuan</Button>
          </Form>
        </Card.Body>
      </Card>

      <Row className="g-2 mb-4">
        <Col>
          <Button className="w-100" onClick={async () => {
            const blob = await generatePDFBlob();
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
          }}>👁️ Preview PDF</Button>
        </Col>
        <Col>
          <Button className="w-100" onClick={async () => {
            const blob = await generatePDFBlob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${form.filename || "laporan"}.pdf`;
            a.click();
          }}>📄 Unduh PDF</Button>
        </Col>
        <Col>
          <Button className="w-100" onClick={async () => {
            try {
              const isEdit = editMode && form._index;
              for (let i = 0; i < form.temuanList.length; i++) {
                const temuan = form.temuanList[i];
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
                if (isEdit) {
                  payload.edit = "edit";
                  payload.index = form._index;
                }
                const res = await axios.post(endpoint, new URLSearchParams(payload));
                if (!res.data.ok) throw new Error(res.data.message);
              }
              alert(isEdit ? "✅ Data berhasil diedit!" : "✅ Data berhasil dikirim!");
              setForm({ tanggal: "", wilayah: "", area: "", temuanList: [blankTemuan()], filename: "patroli", _index: null });
              setEditMode(false);
            } catch (err) {
              alert("❌ Gagal kirim data: " + err.message);
            }
          }}>
            {editMode ? "💾 Simpan Perubahan" : "📤 Kirim ke Google Sheets"}
          </Button>
        </Col>
      </Row>

      {pdfPreviewUrl && (
        <div className="mb-4">
          <iframe src={pdfPreviewUrl} title="PDF Preview" style={{ width: "100%", height: "500px" }}></iframe>
        </div>
      )}

      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Data Tersimpan</h5>
          <Table striped bordered hover responsive size="sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Tanggal</th>
                <th>Wilayah</th>
                <th>Area</th>
                <th>Deskripsi</th>
                <th>Tindakan</th>
                <th>Hasil</th>
                <th>Koordinat</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="9" className="text-center">Belum ada data</td></tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.tanggal}</td>
                    <td>{row.wilayah}</td>
                    <td>{row.area}</td>
                    <td>{row.deskripsi}</td>
                    <td>{row.tindakan}</td>
                    <td>{row.hasil}</td>
                    <td>{row.koordinat}</td>
                    <td>
                      <Button size="sm" variant="warning" onClick={() => handleEditTemuan(row)}>
                        ✏️ Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={!!previewImage} onHide={() => setPreviewImage(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Pratinjau Foto</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {previewImage && (
            <img src={previewImage.thumb} alt="Preview" style={{ maxWidth: "100%" }} />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPreviewImage(null)}>Batal</Button>
          <Button variant="primary" onClick={() => {
            if (previewIndex !== null) {
              setForm((p) => {
                const updatedList = [...p.temuanList];
                updatedList[previewIndex] = {
                  ...updatedList[previewIndex],
                  foto: previewImage.file,
                  fotoThumb: previewImage.thumb,
                  koordinat: previewImage.koordinat,
                  statusGPS: " Lokasi berhasil diambil",
                };
                return { ...p, temuanList: updatedList };
              });
            }
            setPreviewImage(null);
            setPreviewIndex(null);
          }}>Gunakan</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Fasfield;
