import React, { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import axios from "axios";
import logoURL from "../assets/logo-jlm.jpeg";
import {
  Container, Row, Col, Form, Button, Card, Image, Modal
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
    tanggal: "",
    wilayah: "",
    area: "",
    temuanList: [blankTemuan()],
    filename: "patroli"
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

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
        setPreviewImage({ file, thumb, koordinat });
        setPreviewIndex(i);
      } catch (err) {
        alert("❌ Gagal memproses gambar. Silakan coba lagi.");
      }
    };
    input.click();
  };

  const generatePDFBlob = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("times", "");

    try {
      const img = new Image();
      img.src = logoURL;
      await new Promise((resolve) => { img.onload = () => resolve(); });
      doc.addImage(img, "JPEG", 88, 10, 35, 20);
      doc.setGState(new doc.GState({ opacity: 0.05 }));
      doc.addImage(img, "JPEG", 50, 80, 100, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch {}

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(16);
    doc.text(PDF_TITLE, 105, 35, { align: "center" });

    doc.setFontSize(11);
    doc.text(`Tanggal: ${form.tanggal}`, 14, 45);
    doc.text(`Wilayah: ${form.wilayah}`, 14, 51);
    doc.text(`Area: ${form.area}`, 14, 57);

    let y = 67;
    const margin = 14;

    for (const [i, t] of form.temuanList.entries()) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      const boxHeight = 52;
      doc.setDrawColor(255, 0, 0);
      doc.setFillColor(255, 240, 240);
      doc.roundedRect(margin, y - 2, 182, boxHeight, 2, 2, 'FD');

      doc.setTextColor(0, 0, 120);
      doc.setFontSize(12);
      doc.text(`Temuan #${i + 1}`, margin + 2, y + 4);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      y += 8;

      const textX = margin + 2;
      const textY = y;
      const fieldPad = 24;
      const imgX = margin + 100;
      const imgY = y;

      doc.text("Deskripsi", textX, textY);
      doc.text(":", textX + fieldPad, textY);
      doc.text(t.deskripsi || "-", textX + fieldPad + 2, textY);

      doc.text("Tindakan", textX, textY + 6);
      doc.text(":", textX + fieldPad, textY + 6);
      doc.text(t.tindakan || "-", textX + fieldPad + 2, textY + 6);

      doc.text("Hasil", textX, textY + 12);
      doc.text(":", textX + fieldPad, textY + 12);
      doc.text(t.hasil || "-", textX + fieldPad + 2, textY + 12);

      doc.text("Koordinat", textX, textY + 18);
      doc.text(":", textX + fieldPad, textY + 18);
      doc.text(t.koordinat || "-", textX + fieldPad + 2, textY + 18);

      if (t.fotoThumb) {
        try {
          doc.addImage(t.fotoThumb, "JPEG", imgX, imgY, 60, 40);
        } catch {}
      }

      y += boxHeight + 4;
    }

    return doc.output("blob");
  };

  return (
    <Container className="py-3">
      <h4 className="text-center mb-3">Laporan Patroli</h4>
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
              <div className="text-end">
                <Button variant="danger" size="sm" onClick={() => {
                  if (form.temuanList.length > 1) {
                    setForm(p => ({ ...p, temuanList: p.temuanList.filter((_, idx) => idx !== i) }));
                  }
                }}>Hapus</Button>
              </div>
            </Card.Body>
          </Card>
        ))}

        <div className="text-center mb-3">
          <Button onClick={() => setForm(p => ({ ...p, temuanList: [...p.temuanList, blankTemuan()] }))}>+ Tambah Temuan</Button>
        </div>

        <Row className="g-2 mb-4">
          <Col>
            <Button className="w-100" onClick={async () => {
              const blob = await generatePDFBlob();
              const url = URL.createObjectURL(blob);
              setPdfPreviewUrl(url);
            }}>
              👁️ Preview PDF
            </Button>
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
                setForm({ tanggal: "", wilayah: "", area: "", temuanList: [blankTemuan()], filename: "patroli" });
              } catch (err) {
                alert("❌ Gagal kirim data: " + err.message);
              }
            }}>📤 Kirim ke Google Sheets</Button>
          </Col>
        </Row>

        {pdfPreviewUrl && (
          <div className="mb-4">
            <iframe src={pdfPreviewUrl} title="PDF Preview" style={{ width: "100%", height: "500px" }}></iframe>
          </div>
        )}

        {/* Modal Preview Foto */}
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
            <Button
              variant="primary"
              onClick={() => {
                if (previewIndex !== null) {
                  setForm((p) => {
                    const updatedList = [...p.temuanList];
                    updatedList[previewIndex] = {
                      ...updatedList[previewIndex],
                      foto: previewImage.file,
                      fotoThumb: previewImage.thumb,
                      koordinat: previewImage.koordinat,
                      statusGPS: "✅ Lokasi berhasil diambil",
                    };
                    return { ...p, temuanList: updatedList };
                  });
                }
                setPreviewImage(null);
                setPreviewIndex(null);
              }}
            >
              Gunakan
            </Button>
          </Modal.Footer>
        </Modal>
      </Form>
    </Container>
  );
}

export default Fasfield;
