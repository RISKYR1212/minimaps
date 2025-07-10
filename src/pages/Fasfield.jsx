import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import logoURL from "../assets/logo-jlm.jpeg";

const LOCAL_KEY = "fasfield_isp_form_v2";
const PDF_TITLE = "LAPORAN PATROLI";

const blankTemuan = () => ({
  deskripsi: "", tindakan: "", hasil: "",
  foto: null, fotoThumb: "", koordinat: "", statusGPS: ""
});

const ambilGPS = () => new Promise((ok, no) => {
  if (!navigator.geolocation) return no("Geolocation tidak didukung browser");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => ok(`${coords.latitude},${coords.longitude}`),
    (err) => no(err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

const resizeImage = (file, max = 200, q = 0.6) => new Promise(ok => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    const s = Math.min(1, max / img.width);
    c.width = img.width * s;
    c.height = img.height * s;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    ok(c.toDataURL("image/jpeg", q));
  };
  img.src = URL.createObjectURL(file);
});

const fileToBase64 = blob => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

function Fasfield() {
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    tanggal: "", hari: "", wilayah: "", area: "", keterangan: "",
    temuanList: [blankTemuan()]
  });
  const [filename, setFilename] = useState("patroli");

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

  const handleFileInput = async (i, file) => {
    if (!file) return;
    const thumb = await resizeImage(file);
    updateTemuan(i, "statusGPS", "Mengambil lokasi...");
    let koordinat = "";
    try {
      koordinat = await ambilGPS();
      updateTemuan(i, "statusGPS", "✅ Lokasi berhasil diambil");
    } catch (err) {
      console.warn("GPS Error:", err);
      updateTemuan(i, "statusGPS", `❌ Gagal ambil lokasi (${err})`);
    }
    setForm(p => {
      const l = [...p.temuanList];
      l[i] = { ...l[i], foto: file, fotoThumb: thumb, koordinat };
      return { ...p, temuanList: l };
    });
  };

  const addTemuan = () =>
    setForm(p => ({ ...p, temuanList: [...p.temuanList, blankTemuan()] }));
  const removeTemuan = i =>
    setForm(p => p.temuanList.length === 1 ? p : { ...p, temuanList: p.temuanList.filter((_, idx) => idx !== i) });

  const header = (doc, logoB64) => {
    doc.addImage(logoB64, "JPEG", 20, 10, 30, 15);
    doc.setFontSize(16).setFont(undefined, "bold")
      .text(PDF_TITLE, 105, 20, { align: "center" });
    return 30;
  };

  const downloadPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const logoB64 = await fileToBase64(await fetch(logoURL).then(r => r.blob()));
    let y = header(doc, logoB64);

    [["Tanggal", form.tanggal], ["Hari", form.hari], ["Wilayah", form.wilayah], ["Area", form.area]]
      .forEach(([k, v]) => {
        doc.setFont(undefined, "bold").text(k, 20, y);
        doc.setFont(undefined, "normal").text(`: ${v || "-"}`, 55, y);
        y += 7;
      });
    y += 5;

    for (const [idx, t] of form.temuanList.entries()) {
      if (y > 230) { doc.addPage(); y = header(doc, logoB64); }
      doc.setFontSize(12).setFont(undefined, "bold").text(`Temuan #${idx + 1}`, 20, y); y += 8;

      [["Deskripsi", t.deskripsi], ["Tindakan", t.tindakan], ["Hasil", t.hasil], ["Koordinat", t.koordinat]]
        .forEach(([k, v]) => {
          doc.setFont(undefined, "bold").text(k, 22, y);
          doc.setFont(undefined, "normal")
             .text(`: ${v || "-"}`, 50, y, { maxWidth: 135 });
          y += doc.getTextDimensions(v || "-").h + 4;
        });

      if (t.foto) {
        const img64 = await fileToBase64(t.foto);
        if (y > 200) { doc.addPage(); y = header(doc, logoB64); }
        const imgWidth = 70;
        const imgHeight = 50;
        const centerX = (210 - imgWidth) / 2;
        doc.addImage(img64, "JPEG", centerX, y, imgWidth, imgHeight); y += imgHeight + 8;
      }
    }

    if (form.keterangan) {
      if (y > 250) { doc.addPage(); y = header(doc, logoB64); }
      doc.setFont(undefined, "bold").text("Keterangan Umum", 20, y); y += 6;
      doc.setFont(undefined, "normal").text(doc.splitTextToSize(form.keterangan, 165), 20, y);
    }

    const safeName = filename.trim() ? filename.trim() : "patroli";
    doc.save(`${safeName}_${form.tanggal || Date.now()}.pdf`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20, textAlign: "center" }}>
      <h2>REPORT PATROLI</h2>
      <form>
        {[["Tanggal", "date"], ["Wilayah", "text"], ["Area", "text"]].map(([label, type], i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: "bold" }}>{label}</label>
            <input
              type={type}
              name={label.toLowerCase()}
              value={form[label.toLowerCase()]}
              onChange={rootChange}
              style={{ width: "100%", padding: 8 }}
              required={label !== "Area"}
            />
          </div>
        ))}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: "bold" }}>Hari</label>
          <input value={form.hari} readOnly style={{ width: "100%", padding: 8 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: "bold" }}>Nama File PDF</label>
          <input type="text" value={filename} onChange={e => setFilename(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        {form.temuanList.map((t, i) => (
          <div key={i} style={{ border: "1px solid #ccc", padding: 10, borderRadius: 4, marginBottom: 14 }}>
            <h4>Temuan #{i + 1}</h4>
            {["deskripsi", "tindakan"].map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: "bold" }}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <textarea value={t[field]} onChange={e => updateTemuan(i, field, e.target.value)} style={{ width: "100%", padding: 8, minHeight: 60 }} required />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: "bold" }}>Hasil</label>
              <select value={t.hasil} onChange={e => updateTemuan(i, "hasil", e.target.value)} style={{ width: "100%", padding: 8 }} required>
                <option value="">Pilih</option>
                <option>Baik</option>
                <option>Perlu Perbaikan</option>
                <option>Darurat</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: "bold" }}>Foto Temuan</label>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ padding: "8px 14px", background: "#4CAF50", color: "white", cursor: "pointer" }}>
                  Kamera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => handleFileInput(i, e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </label>
                <label style={{ padding: "8px 14px", background: "#4CAF50", color: "white", cursor: "pointer" }}>
                  Galeri
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileInput(i, e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {t.fotoThumb && <img src={t.fotoThumb} alt="preview" style={{ width: 120, marginTop: 6, borderRadius: 4 }} />}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: "bold" }}>Koordinat</label>
              <input value={t.koordinat} readOnly style={{ width: "100%", padding: 8 }} />
              {t.statusGPS && <p style={{ fontSize: 12, color: "#888" }}>{t.statusGPS}</p>}
            </div>

            {form.temuanList.length > 1 && (
              <button type="button" onClick={() => removeTemuan(i)} style={{ padding: "8px 14px", background: "#d9534f", color: "white", cursor: "pointer" }}>
                Hapus Temuan
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addTemuan} style={{ padding: "8px 14px", background: "#4CAF50", color: "white", cursor: "pointer" }}>+ Tambah Temuan</button>

        <div style={{ marginBottom: 12, marginTop: 20 }}>
          <label style={{ fontWeight: "bold" }}>Keterangan Umum</label>
          <textarea name="keterangan" value={form.keterangan} onChange={rootChange} style={{ width: "100%", padding: 8, minHeight: 60 }} />
        </div>

        <button type="button" onClick={downloadPDF} style={{ padding: "10px 18px", background: "#4CAF50", color: "white", fontWeight: "bold", cursor: "pointer" }}>Download PDF</button>
      </form>
    </div>
  );
}

export default Fasfield;