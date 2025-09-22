// src/pages/Fasfield.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Form, Button, Card, Table, Spinner } from "react-bootstrap";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import EXIF from "exif-js";
import heic2any from "heic2any";
import logoURL from "../assets/logo-jlm.jpeg";

//KONFIGURASI 
const PDF_TITLE = "LAPORAN PATROLI";
const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

// UTIL DATA =
const blankTemuan = () => ({
  deskripsi: "",
  tindakan: "",
  hasil: "",
  fotoFile: null,
  fotoThumb: null,
  koordinat: "",
  statusGPS: "",
});

// UTIL: GPS dari EXIF -
const getGPSFromImage = (file) =>
  new Promise((resolve) => {
    if (!file) return resolve(null);

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
            return;
          }
        } catch (e) {
          // ignore
        }
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });

// UTIL: GPS Browser (fallback) 
const ambilGPSBrowser = () =>
  new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => ok(`${coords.latitude}, ${coords.longitude}`),
      () => ok(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });

// UTIL: EXIF Orientation Number 
const getExifOrientation = (file) =>
  new Promise((resolve) => {
    if (!file) return resolve(1);
    try {
      EXIF.getData(file, function () {
        try {
          const o = EXIF.getTag(this, "Orientation");
          resolve(o || 1);
        } catch {
          resolve(1);
        }
      });
    } catch {
      resolve(1);
    }
  });

//* UTIL: Konversi HEIC → JPEG

async function ensureJpeg(file) {
  if (!file) return file;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  const isHeic =
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  if (isHeic) {
    try {
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8,
      });
      return new File([converted], name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
      });
    } catch (err) {
      console.error("Gagal konversi HEIC:", err);
    }
  }

  return file;
}

async function resizeWithOrientation(file, maxSize = 1200, quality = 0.7) {
  return new Promise(async (resolve, reject) => {
    if (!file) return resolve(null);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const orientation = await getExifOrientation(file);

          let w = img.width;
          let h = img.height;
          const scale = Math.min(maxSize / w, maxSize / h, 1);
          const destW = Math.round(w * scale);
          const destH = Math.round(h * scale);

          const swap = orientation >= 5 && orientation <= 8;
          canvas.width = swap ? destH : destW;
          canvas.height = swap ? destW : destH;

          // apply orientation transforms
          switch (orientation) {
            case 2:
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              break;
            case 3:
              ctx.translate(canvas.width, canvas.height);
              ctx.rotate(Math.PI);
              break;
            case 4:
              ctx.translate(0, canvas.height);
              ctx.scale(1, -1);
              break;
            case 5:
              ctx.rotate(0.5 * Math.PI);
              ctx.scale(1, -1);
              break;
            case 6:
              ctx.rotate(0.5 * Math.PI);
              ctx.translate(0, -canvas.width);
              break;
            case 7:
              ctx.rotate(0.5 * Math.PI);
              ctx.translate(canvas.height, -canvas.width);
              ctx.scale(-1, 1);
              break;
            case 8:
              ctx.rotate(-0.5 * Math.PI);
              ctx.translate(-canvas.height, 0);
              break;
            default:
              break;
          }

          if (swap) {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, destH, destW);
          } else {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, destW, destH);
          }

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 100);
        }
      };
      img.onerror = () => reject("Gagal load gambar");
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

// ---------- COMPONENT ----------
function Fasfield() {
  const [form, setForm] = useState({ temuanList: [blankTemuan()] });
  const [editMode, setEditMode] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // persist ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem("patroliForm", JSON.stringify(form));
    } catch { }
  }, [form]);

  // fetch data awal dari endpoint bila tersedia
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

  const addTemuan = () => {
    setForm((prev) => ({ ...prev, temuanList: [...prev.temuanList, blankTemuan()] }));
  };

  const updateTemuan = (i, key, val) => {
    setForm((prev) => {
      const list = [...prev.temuanList];
      list[i] = { ...list[i], [key]: val };
      return { ...prev, temuanList: list };
    });
  };

  // pickImage sekarang berada di dalam komponen (akses setForm)
  // pickImage sekarang berada di dalam komponen (akses setForm)
  const pickImage = async (idx, fromCamera = false) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/heic,image/heif,image/webp";
    if (fromCamera) input.capture = "environment";

    input.onchange = async (e) => {
      const target = e?.target;
      let file = target?.files?.[0];
      if (!file) {
        if (target) target.value = "";
        input.remove();
        return;
      }

      try {
        console.log("📂 File diupload:", file.type, file.name, file.size);

        // 🔔 ALERT AKTIFKAN GPS
        alert("Aktifkan GPS untuk mendapatkan lokasi dari foto.");

        // konversi
        file = await ensureJpeg(file);

        // ambil GPS (EXIF) -> fallback
        let koordinat = (await getGPSFromImage(file)) || (await ambilGPSBrowser());

        // resize thumbnail (kalau gagal, turun ukuran)
        let thumb = null;
        try {
          thumb = await resizeWithOrientation(file, 1000, 0.7);
        } catch (err) {
          console.warn("Resize gagal, coba ukuran lebih kecil:", err);
          try {
            thumb = await resizeWithOrientation(file, 800, 0.7);
          } catch (e) {
            console.error("Resize benar-benar gagal:", e);
            thumb = null;
          }
        }

        // update state
        setForm((prev) => {
          const list = [...prev.temuanList];
          list[idx] = {
            ...list[idx],
            fotoFile: file,
            fotoThumb: thumb,
            koordinat: koordinat || "",
            statusGPS: koordinat
              ? "Lokasi berhasil diambil"
              : "GPS tidak tersedia, pastikan GPS aktif.",
          };
          return { ...prev, temuanList: list };
        });
      } catch (err) {
        console.error("Gagal memproses foto:", err);
        alert("Foto gagal diproses. Gunakan JPG/PNG/HEIC yang valid atau coba ukuran lebih kecil.");
      } finally {
        if (target) target.value = "";
        input.remove();
      }
    };

    input.click();
  };

  // PDF GENERATOR
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
      // try-catch: addImage dapat melempar error kalau data rusak
      try {
        doc.addImage(img, "JPEG", 88, 10, 35, 20);
      } catch (e) {
        console.warn("logo gagal ditambahkan ke PDF:", e);
      }
    } catch { }

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
  const [preview, setPreview] = useState(null);

  const handleFileChange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    file = await ensureJpeg(file); // convert jika HEIC
    setPreview(URL.createObjectURL(file));
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

  // RENDER UI 
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
                    value={form.tanggal || ""}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Control
                    placeholder="Wilayah"
                    value={form.wilayah || ""}
                    onChange={(e) => setForm({ ...form, wilayah: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Control
                    placeholder="Area"
                    value={form.area || ""}
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

                  <Form.Group>
                    <Form.Label>tambahkan foto</Form.Label>
                    <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
                  </Form.Group>

                  {preview && (
                    <div className="mt-1">
                      <img
                        src={preview}
                        alt="preview"
                        style={{ maxWidth: "100%", borderRadius: "8px" }}
                      />
                    </div>
                  )}


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

            <Button onClick={addTemuan} variant="outline-primary">
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
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${form.filename || "laporan"}.pdf`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
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
