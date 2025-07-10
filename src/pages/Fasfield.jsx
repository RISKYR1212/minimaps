import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import logoURL from "../assets/logo-jlm.jpeg"; // pastikan file ini ada

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
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
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

  const fileTemuanChange = async (i, e) => {
    const file = e.target.files[0];
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
    doc.addImage(logoB64, "JPEG", 15, 15, 25, 15);
    doc.setFontSize(16).setFont(undefined, "bold")
       .text(PDF_TITLE, 105, 25, { align: "center" });
    return 35;
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
        doc.addImage(img64, "JPEG", 70, y, 60, 40); y += 45;
      }
      y += 4;
    }

    if (form.keterangan) {
      if (y > 250) { doc.addPage(); y = header(doc, logoB64); }
      doc.setFont(undefined, "bold").text("Keterangan Umum", 20, y); y += 6;
      doc.setFont(undefined, "normal").text(doc.splitTextToSize(form.keterangan, 165), 20, y);
    }

    const safeName = filename.trim() ? filename.trim() : "patroli";
    doc.save(`${safeName}_${form.tanggal || Date.now()}.pdf`);
  };

  const css = {
    g: { marginBottom: 12 },
    lbl: { fontWeight: "bold" },
    in: { width: "100%", padding: 8 },
    ta: { width: "100%", padding: 8, minHeight: 60 },
    sel: { width: "100%", padding: 8 },
    btn: {
      padding: "8px 14px", marginRight: 8, marginTop: 6,
      color: "#fff", background: "#4CAF50", border: "none", cursor: "pointer"
    },
    box: { border: "1px solid #ccc", padding: 10, borderRadius: 4, marginBottom: 14 }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20, textAlign: "center" }}>
      <h2>REPORT PATROLI</h2>

      <form>
        {/* metadata */}
        {[
          ["Tanggal", "tanggal", "date"],
          ["Wilayah", "wilayah", "text"],
          ["Area", "area", "text"]
        ].map(([lab, nm, tp]) => (
          <div key={nm} style={css.g}>
            <label style={css.lbl}>{lab}</label>
            <input type={tp} name={nm} value={form[nm]}
              onChange={rootChange} style={css.in}
              required={nm !== "area"} />
          </div>
        ))}

        <div style={css.g}>
          <label style={css.lbl}>Hari</label>
          <input value={form.hari} readOnly style={css.in} />
        </div>

        <div style={css.g}>
          <label style={css.lbl}>Nama File PDF</label>
          <input type="text" value={filename}
            onChange={(e) => setFilename(e.target.value)}
            style={css.in} placeholder="mis: laporan_juli" />
        </div>

        {form.temuanList.map((t, i) => (
          <div key={i} style={css.box}>
            <h4>Temuan #{i + 1}</h4>
            {["deskripsi", "tindakan"].map(f => (
              <div key={f} style={css.g}>
                <label style={css.lbl}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <textarea value={t[f]} onChange={e => updateTemuan(i, f, e.target.value)}
                  style={css.ta} required />
              </div>
            ))}
            <div style={css.g}>
              <label style={css.lbl}>Hasil</label>
              <select value={t.hasil} onChange={e => updateTemuan(i, "hasil", e.target.value)}
                style={css.sel} required>
                <option value="">Pilih</option>
                <option>Baik</option>
                <option>Perlu Perbaikan</option>
                <option>Darurat</option>
              </select>
            </div>

            {/* Kamera atau File Upload */}
            <div style={css.g}>
              <label style={css.lbl}>Foto Temuan</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => fileTemuanChange(i, e)}
                style={css.in}
              />
              {t.fotoThumb && (
                <img src={t.fotoThumb} alt="preview"
                  style={{ width: 120, marginTop: 6, borderRadius: 4 }} />
              )}
            </div>

            {/* Status GPS */}
            <div style={css.g}>
              <label style={css.lbl}>Koordinat</label>
              <input value={t.koordinat} readOnly style={css.in} />
              {t.statusGPS && <p style={{ fontSize: 12, color: "#888" }}>{t.statusGPS}</p>}
            </div>

            {form.temuanList.length > 1 && (
              <button type="button" onClick={() => removeTemuan(i)}
                style={{ ...css.btn, background: "#d9534f" }}>
                Hapus Temuan
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addTemuan} style={css.btn}>
          + Tambah Temuan
        </button>

        <div style={css.g}>
          <label style={css.lbl}>Keterangan Umum</label>
          <textarea name="keterangan" value={form.keterangan}
            onChange={rootChange} style={css.ta} />
        </div>

        <button type="button" onClick={downloadPDF} style={css.btn}>
          Download PDF
        </button>
      </form>
    </div>
  );
}

export default Fasfield;
