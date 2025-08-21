// src/pages/Fasfield.jsx
import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import axios from "axios";
import logoURL from "../assets/logo-jlm.jpeg";
import { Container, Row, Col, Form, Button, Card, Table } from "react-bootstrap";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import EXIF from "exif-js";

const PDF_TITLE = "LAPORAN PATROLI";
const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

const blankTemuan = () => ({
  deskripsi: "",
  tindakan: "",
  hasil: "",
  foto: null,
  fotoThumb: "",
  koordinat: "",
  statusGPS: ""
});

// Baca GPS dari EXIF
const getGPSFromImage = (file) => {
  return new Promise((resolve) => {
    EXIF.getData(file, function () {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lon = EXIF.getTag(this, "GPSLongitude");
      const latRef = EXIF.getTag(this, "GPSLatitudeRef");
      const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

      if (lat && lon && latRef && lonRef) {
        const convertDMSToDD = (dms, ref) => {
          const deg = dms[0].numerator / dms[0].denominator;
          const min = dms[1].numerator / dms[1].denominator;
          const sec = dms[2].numerator / dms[2].denominator;
          let dd = deg + min / 60 + sec / 3600;
          if (ref === "S" || ref === "W") dd *= -1;
          return dd;
        };
        const latitude = convertDMSToDD(lat, latRef);
        const longitude = convertDMSToDD(lon, lonRef);
        resolve(`${latitude}, ${longitude}`);
      } else {
        resolve(null);
      }
    });
  });
};

// Ambil GPS dari browser
const ambilGPS = () =>
  new Promise((ok, no) => {
    if (!navigator.geolocation) return no("Geolocation tidak didukung browser");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => ok(`${coords.latitude}, ${coords.longitude}`),
      (err) => no(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

// Resize gambar jadi base64
const resizeImage = (file, max = 600, q = 0.8) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          c.width = img.width * scale;
          c.height = img.height * scale;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const dataUrl = c.toDataURL("image/jpeg", q);
          resolve(dataUrl);
        } catch (err) {
          reject("Gagal konversi gambar");
        }
      };
      img.onerror = () => reject("Gagal memuat gambar");
      img.src = reader.result;
    };
    reader.onerror = () => reject("Gagal membaca file gambar");
    reader.readAsDataURL(file);
  });

function Fasfield() {
  const [form, setForm] = useState(() => {
    // Ambil data form dari localStorage kalau ada
    const saved = localStorage.getItem("patroliForm");
    return saved
      ? JSON.parse(saved)
      : { tanggal: "", wilayah: "", area: "", temuanList: [blankTemuan()], filename: "patroli", _index: null };
  });

  const [editMode, setEditMode] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [data, setData] = useState([]);

  // Simpan otomatis ke localStorage setiap ada perubahan form
  useEffect(() => {
    localStorage.setItem("patroliForm", JSON.stringify(form));
  }, [form]);

  // Ambil data awal dari Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${endpoint}?sheet=patrolli`);
        if (res.data.ok) setData(res.data.records);
      } catch (err) {
        console.error("Gagal ambil data:", err);
      }
    };
    fetchData();
  }, []);

  const updateTemuan = (i, key, val) => {
    setForm((prev) => {
      const updated = [...prev.temuanList];
      updated[i] = { ...updated[i], [key]: val };
      return { ...prev, temuanList: updated };
    });
  };

  // Ambil foto
  const ambilFoto = async (i, capture = false) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.capture = "environment";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      let koordinat = "";
      try {
        const gpsFromExif = await getGPSFromImage(file);
        koordinat = gpsFromExif || (await ambilGPS());
      } catch (err) {
        updateTemuan(i, "statusGPS", `Gagal ambil lokasi (${err})`);
      }

      try {
        const thumb = await resizeImage(file);
        setForm((p) => {
          const updated = [...p.temuanList];
          updated[i] = {
            ...updated[i],
            foto: file,
            fotoThumb: thumb,
            koordinat,
            statusGPS: "Lokasi berhasil diambil"
          };
          return { ...p, temuanList: updated };
        });
      } catch (err) {
        alert("Gagal memproses gambar: " + err);
      }
    };

    input.click();
  };

  const handleEditTemuan = (row) => {
    setForm({
      tanggal: row.tanggal,
      wilayah: row.wilayah,
      area: row.area,
      temuanList: [
        {
          deskripsi: row.deskripsi,
          tindakan: row.tindakan,
          hasil: row.hasil,
          foto: null,
          fotoThumb: "",
          koordinat: row.koordinat,
          statusGPS: ""
        }
      ],
      filename: "patroli",
      _index: row._index
    });
    setEditMode(true);
  };

  // Generate PDF
  const generatePDFBlob = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("times", "");

    try {
      const img = new window.Image();
      img.src = logoURL;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
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

      const textX = 14,
        imageX = 140;
      const textWidth = 90,
        imageWidth = 50,
        imageHeight = 45;
      const lineHeight = 6;

      const lines = [
        ...doc.splitTextToSize(`Deskripsi: ${t.deskripsi}`, textWidth),
        ...doc.splitTextToSize(`Tindakan: ${t.tindakan}`, textWidth),
        ...doc.splitTextToSize(`Hasil: ${t.hasil}`, textWidth),
        ...doc.splitTextToSize(`Koordinat: ${t.koordinat}`, textWidth)
      ];

      doc.setFontSize(11);
      let currentY = y;
      lines.forEach((line) => {
        doc.text(line, textX, currentY);
        currentY += lineHeight;
      });

      if (t.fotoThumb) {
        try {
          doc.addImage(t.fotoThumb, "JPEG", imageX, y, imageWidth, imageHeight);
        } catch {
          doc.text("Gagal tampilkan gambar", imageX, y);
        }
      }
      y += Math.max(lines.length * lineHeight, imageHeight) + 10;
    }

    return doc.output("blob");
  };

  // Unduh Excel
  const downloadExcel = () => {
    if (!data.length) return alert("Tidak ada data untuk diunduh");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Patroli");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "data_patrol.xlsx");
  };

  return (
    <Container className="py-3">
      <h4 className="text-center mb-3">Laporan Patroli</h4>

      {/* Form Input */}
      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Control
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control
                placeholder="Wilayah"
                value={form.wilayah}
                onChange={(e) => setForm({ ...form, wilayah: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control
                placeholder="Area"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </Form.Group>

            {form.temuanList.map((t, i) => (
              <Card key={i} className="mb-3">
                <Card.Body>
                  <Form.Group className="mb-2">
                    <Form.Control
                      placeholder="Deskripsi"
                      value={t.deskripsi}
                      onChange={(e) => updateTemuan(i, "deskripsi", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control
                      placeholder="Tindakan"
                      value={t.tindakan}
                      onChange={(e) => updateTemuan(i, "tindakan", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control
                      placeholder="Hasil"
                      value={t.hasil}
                      onChange={(e) => updateTemuan(i, "hasil", e.target.value)}
                    />
                  </Form.Group>
                  <div className="d-flex gap-2 mb-2">
                    <Button size="sm" onClick={() => ambilFoto(i, true)}>
                      Kamera
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => ambilFoto(i, false)}>
                      Galeri
                    </Button>
                  </div>
                  {t.fotoThumb && (
                    <img src={t.fotoThumb} alt="preview" className="mb-2 img-fluid rounded" />
                  )}
                  <div className="text-muted small mb-2">{t.statusGPS}</div>
                </Card.Body>
              </Card>
            ))}

            <Button
              onClick={() =>
                setForm((p) => ({ ...p, temuanList: [...p.temuanList, blankTemuan()] }))
              }
            >
              Tambah Temuan
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Tombol Aksi */}
      <Row className="g-2 mb-4">
        <Col>
          <Button
            className="w-100"
            onClick={async () => {
              const blob = await generatePDFBlob();
              const url = URL.createObjectURL(blob);
              setPdfPreviewUrl(url);
            }}
          >
            Lihat PDF
          </Button>
        </Col>
        <Col>
          <Button
            className="w-100"
            onClick={async () => {
              const blob = await generatePDFBlob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${form.filename || "laporan"}.pdf`;
              a.click();
            }}
          >
            Unduh PDF
          </Button>
        </Col>
        <Col>
          <Button
            className="w-100"
            onClick={async () => {
              try {
                const isEdit = editMode && form._index;
                for (let t of form.temuanList) {
                  const payload = {
                    sheet: "patrolli",
                    tanggal: form.tanggal,
                    wilayah: form.wilayah,
                    area: form.area,
                    deskripsi: t.deskripsi,
                    tindakan: t.tindakan,
                    hasil: t.hasil,
                    koordinat: t.koordinat
                  };
                  if (isEdit) {
                    payload.edit = "edit";
                    payload.index = form._index;
                  }
                  const res = await axios.post(endpoint, new URLSearchParams(payload));
                  if (!res.data.ok) throw new Error(res.data.message);
                }
                alert(isEdit ? "Data berhasil diedit!" : "Data berhasil dikirim!");
                setForm({
                  tanggal: "",
                  wilayah: "",
                  area: "",
                  temuanList: [blankTemuan()],
                  filename: "patroli",
                  _index: null
                });
                setEditMode(false);
                localStorage.removeItem("patroliForm"); // reset cache
              } catch (err) {
                alert("Gagal kirim data: " + err.message);
              }
            }}
          >
            {editMode ? "Simpan Perubahan" : "Kirim ke Google Sheets"}
          </Button>
        </Col>
        <Col>
          <Button className="w-100" variant="success" onClick={downloadExcel}>
            Unduh Data
          </Button>
        </Col>
      </Row>

      {/* Preview PDF */}
      {pdfPreviewUrl && (
        <div className="mb-4">
          <iframe
            src={pdfPreviewUrl}
            title="PDF Preview"
            style={{ width: "100%", height: "500px" }}
          ></iframe>
        </div>
      )}

      {/* Tabel Data */}
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
                <tr>
                  <td colSpan="9" className="text-center">
                    Belum ada data
                  </td>
                </tr>
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
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Fasfield;
