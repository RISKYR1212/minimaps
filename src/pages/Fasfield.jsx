import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Form, Button, Card, Table, Spinner } from "react-bootstrap";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import EXIF from "exif-js";
import heic2any from "heic2any";
import logoURL from "../assets/logo-jlm.jpeg";

/* ======================== KONFIGURASI ======================== */
const PDF_TITLE = "LAPORAN PATROLI";
const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

/* ======================== UTIL DATA ========================= */
const blankTemuan = () => ({
  deskripsi: "",
  tindakan: "",
  hasil: "",
  fotoFile: null,
  fotoThumb: "",
  koordinat: "",
  statusGPS: "",
});

/* ===================== UTIL: GPS dari EXIF =================== */
const getGPSFromImage = (file) =>
  new Promise((resolve) => {
    if (!file || file.type !== "image/jpeg") return resolve(null);
    try {
      EXIF.getData(file, function () {
        try {
          const lat = EXIF.getTag(this, "GPSLatitude");
          const lon = EXIF.getTag(this, "GPSLongitude");
          const latRef = EXIF.getTag(this, "GPSLatitudeRef");
          const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
          if (lat && lon && latRef && lonRef) {
            const toDD = (dms, ref) => {
              const deg = dms[0].numerator / dms[0].denominator;
              const min = dms[1].numerator / dms[1].denominator;
              const sec = dms[2].numerator / dms[2].denominator;
              let dd = deg + min / 60 + sec / 3600;
              if (ref === "S" || ref === "W") dd *= -1;
              return dd;
            };
            resolve(`${toDD(lat, latRef)}, ${toDD(lon, lonRef)}`);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });

/* =============== UTIL: GPS Browser (fallback) =============== */
const ambilGPSBrowser = () =>
  new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => ok(`${coords.latitude}, ${coords.longitude}`),
      () => ok(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });

/* =============== UTIL: EXIF Orientation Number ============== */
const getExifOrientation = (file) =>
  new Promise((resolve) => {
    if (!file || file.type !== "image/jpeg") return resolve(1);
    try {
      EXIF.getData(file, function () {
        const o = EXIF.getTag(this, "Orientation");
        resolve(o || 1);
      });
    } catch {
      resolve(1);
    }
  });

/* =============== UTIL: Konversi HEIC → JPEG ================= */
async function ensureJpeg(file) {
  if (!file) return file;
  if (file.type === "image/heic" || file.type === "image/heif") {
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    return new File([converted], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
  }
  return file;
}

/* === UTIL: Resize + perbaikan orientasi untuk preview/PDF === */
async function resizeWithOrientation(file, max = 1280, quality = 0.82) {
  const blob = file instanceof Blob ? file : new Blob([file], { type: file.type || "image/jpeg" });
  const url = URL.createObjectURL(blob);

  try {
    let imgEl = null;

    imgEl = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error("Gagal memuat gambar"));
      img.src = url;
    });

    const srcW = imgEl.width;
    const srcH = imgEl.height;
    const scale = Math.min(1, max / Math.max(srcW, srcH));
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const orientation = await getExifOrientation(file);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const needsSwap = orientation >= 5 && orientation <= 8;
    canvas.width = needsSwap ? dstH : dstW;
    canvas.height = needsSwap ? dstW : dstH;

    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, canvas.width, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, canvas.width, canvas.height); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, canvas.height); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, canvas.height, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, canvas.height, canvas.width); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, canvas.width); break;
      default: break;
    }

    ctx.drawImage(imgEl, 0, 0, srcW, srcH, 0, 0, needsSwap ? dstH : dstW, needsSwap ? dstW : dstH);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/* ========================== KOMPONEN ======================== */
export function Fasfield() {
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem("patroliForm");
      return saved
        ? JSON.parse(saved)
        : { tanggal: "", wilayah: "", area: "", temuanList: [blankTemuan()], filename: "patroli", _index: null };
    } catch {
      return { tanggal: "", wilayah: "", area: "", temuanList: [blankTemuan()], filename: "patroli", _index: null };
    }
  });

  const [editMode, setEditMode] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Simpan form di localStorage
  useEffect(() => {
    localStorage.setItem("patroliForm", JSON.stringify(form));
  }, [form]);

  // Ambil data dari GAS
  useEffect(() => {
    (async () => {
      if (!endpoint) return;
      try {
        setLoadingData(true);
        const res = await axios.get(`${endpoint}?sheet=patrolli`, { timeout: 20000 });
        const rows = res?.data?.records;
        setData(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error("Gagal ambil data:", err);
        setData([]);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // Update field temuan
  const updateTemuan = (i, key, val) => {
    setForm((prev) => {
      const list = [...prev.temuanList];
      list[i] = { ...list[i], [key]: val };
      return { ...prev, temuanList: list };
    });
  };

  // Pilih foto
  const pickImage = async (idx, useCamera = false) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,.heic,.heif";
  if (useCamera) input.setAttribute("capture", "environment");

  input.onchange = async (e) => {
    let file = e.target.files?.[0];
    if (!file) return;

    try {
      // Konversi HEIC → JPEG (jika perlu)
      try {
        file = await ensureJpeg(file);
      } catch (err) {
        console.warn("Konversi HEIC gagal:", err);
      }

      // Ambil koordinat dari EXIF atau GPS browser
      let koordinat = "";
      try {
        const exifGps = await getGPSFromImage(file);
        koordinat = exifGps || (await ambilGPSBrowser()) || "";
      } catch (err) {
        console.warn("Gagal ambil GPS:", err);
        koordinat = "";
      }

      // Buat thumbnail dengan kompresi (fallback ke URL.createObjectURL jika gagal)
      let thumb;
      try {
        thumb = await resizeWithOrientation(file, 600, 0.6);
      } catch (err) {
        console.warn("Resize gagal, pakai URL object:", err);
        thumb = URL.createObjectURL(file);
      }

      // Update state form
      setForm((p) => {
        const list = [...p.temuanList];
        list[idx] = {
          ...list[idx],
          fotoFile: file,
          fotoThumb: thumb,
          koordinat,
          statusGPS: koordinat ? "Lokasi berhasil diambil" : "Lokasi tidak tersedia",
        };
        return { ...p, temuanList: list };
      });
    } catch (err) {
      console.error("Gagal memproses gambar:", err);
      alert("Gagal memproses gambar. Gunakan format JPG/PNG/HEIC.");
    }
  };

  input.click();
};

  // ✅ Fungsi hapus foto
  const hapusFoto = (idx) => {
    setForm((prev) => {
      const list = [...prev.temuanList];
      list[idx] = {
        ...list[idx],
        fotoFile: null,
        fotoThumb: "",
        koordinat: "",
        statusGPS: "",
      };
      return { ...prev, temuanList: list };
    });
  };

  /* ========================= PDF GENERATOR ========================= */
  const generatePDFBlob = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "normal");

    try {
      const img = new Image();
      img.src = logoURL;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      doc.addImage(img, "JPEG", 88, 10, 35, 20);
    } catch {}

    doc.setFontSize(14);
    doc.text(PDF_TITLE, 105, 35, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Tanggal: ${form.tanggal || "-"}`, 14, 50);
    doc.text(`Wilayah: ${form.wilayah || "-"}`, 14, 56);
    doc.text(`Area: ${form.area || "-"}`, 14, 62);

    let y = 72;
    for (const [idx, t] of form.temuanList.entries()) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(13);
      doc.text(`Temuan #${idx + 1}`, 14, y);
      y += 6;

      const textX = 14,
        imageX = 140;
      const textWidth = 90,
        imageWidth = 50,
        imageHeight = 45;
      const lineHeight = 6;

      const lines = [
        ...doc.splitTextToSize(`Deskripsi: ${t.deskripsi || "-"}`, textWidth),
        ...doc.splitTextToSize(`Tindakan: ${t.tindakan || "-"}`, textWidth),
        ...doc.splitTextToSize(`Hasil: ${t.hasil || "-"}`, textWidth),
        ...doc.splitTextToSize(`Koordinat: ${t.koordinat || "-"}`, textWidth),
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

  const downloadExcel = () => {
    if (!data.length) return alert("Tidak ada data untuk diunduh");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Patroli");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "data_patrol.xlsx");
  };

  const handleEditTemuan = (row) => {
    setForm({
      tanggal: row.tanggal || "",
      wilayah: row.wilayah || "",
      area: row.area || "",
      temuanList: [
        {
          deskripsi: row.deskripsi || "",
          tindakan: row.tindakan || "",
          hasil: row.hasil || "",
          fotoFile: null,
          fotoThumb: "",
          koordinat: row.koordinat || "",
          statusGPS: "",
        },
      ],
      filename: "patroli",
      _index: row._index ?? null,
    });
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitToSheets = async () => {
    if (!endpoint) return alert("Endpoint Google Apps Script belum diatur.");
    try {
      const isEdit = editMode && form._index != null;

      for (let t of form.temuanList) {
        const payload = {
          sheet: "patrolli",
          tanggal: form.tanggal || "",
          wilayah: form.wilayah || "",
          area: form.area || "",
          deskripsi: t.deskripsi || "",
          tindakan: t.tindakan || "",
          hasil: t.hasil || "",
          koordinat: t.koordinat || "",
        };
        if (isEdit) {
          payload.edit = "edit";
          payload.index = form._index;
        }
        await axios.post(endpoint, new URLSearchParams(payload), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 20000,
        });
      }

      alert(isEdit ? "Data berhasil diperbarui!" : "Data berhasil dikirim!");
      setForm({ tanggal: "", wilayah: "", area: "", temuanList: [blankTemuan()], filename: "patroli", _index: null });
      setEditMode(false);
      localStorage.removeItem("patroliForm");
    } catch (err) {
      console.error(err);
      alert("Gagal kirim data: " + (err?.message || "Unknown error"));
    }
  };

  /* =========================== RENDER UI =========================== */
  return (
    <Container className="py-3">
      <h4 className="text-center mb-3">Laporan Patroli</h4>

      {/* Form Input */}
      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Row className="g-2">
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Control
                    placeholder="Wilayah"
                    value={form.wilayah}
                    onChange={(e) => setForm({ ...form, wilayah: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Control
                    placeholder="Area"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

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
                    <Button size="sm" onClick={() => pickImage(i, true)}>
                      Kamera
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => pickImage(i, false)}>
                      Galeri
                    </Button>
                  </div>

                  {t.fotoThumb ? (
                    <img
                      src={t.fotoThumb}
                      alt="preview"
                      className="mb-2 img-fluid rounded"
                      style={{ maxHeight: 260, objectFit: "contain" }}
                    />
                  ) : null}
                  <div className="text-muted small mb-1">{t.statusGPS}</div>
                </Card.Body>
              </Card>
            ))}

            <Button
              onClick={() => setForm((p) => ({ ...p, temuanList: [...p.temuanList, blankTemuan()] }))}
              variant="outline-primary"
            >
              Tambah Temuan
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Tombol Aksi */}
      <Row className="g-2 mb-4">
        <Col xs={12} md={3}>
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
        <Col xs={12} md={3}>
          <Button
            className="w-100"
            onClick={async () => {
              const blob = await generatePDFBlob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${form.filename || "laporan"}.pdf`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Unduh PDF
          </Button>
        </Col>
        <Col xs={12} md={3}>
          <Button className="w-100" onClick={submitToSheets}>
            {editMode ? "Simpan Perubahan" : "Kirim ke Google Sheets"}
          </Button>
        </Col>
        <Col xs={12} md={3}>
          <Button className="w-100" variant="success" onClick={downloadExcel}>
            Unduh Data
          </Button>
        </Col>
      </Row>

      {/* Preview PDF */}
      {pdfPreviewUrl && (
        <div className="mb-4">
          <iframe src={pdfPreviewUrl} title="PDF Preview" style={{ width: "100%", height: "520px" }} />
        </div>
      )}

      {/* Tabel Data */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex align-items-center gap-2 mb-2">
            <h5 className="mb-0">Data Tersimpan</h5>
            {loadingData && <Spinner animation="border" size="sm" />}
          </div>
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
              {!data.length ? (
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
