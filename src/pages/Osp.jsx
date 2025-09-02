// src/pages/Osp.jsx
import axios from "axios";
import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Form, Button, Table, Card
} from "react-bootstrap";
import { X, PencilSquare } from "react-bootstrap-icons";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import "dayjs/locale/id";

dayjs.extend(duration);
dayjs.locale("id");

const endpoint = import.meta.env.VITE_GAS_ENDPOINT;
const LOCAL_KEY = "osp_form_cache";

const fmtDate = d => (d ? dayjs(d).format("DD MMMM YYYY") : "");
const fmtTime = t => {
  if (!t) return "";
  const d = dayjs(t, "HH:mm");
  return d.isValid() ? d.format("HH:mm") : t;
};
const dt = (tgl, jam) => tgl && jam ? dayjs(`${tgl}T${jam}`) : null;
const durasi = (m, s) => {
  if (!m || !s || !m.isValid() || !s.isValid()) return "";
  const diff = s.diff(m);
  if (diff <= 0) return "";
  const d = dayjs.duration(diff);
  return `${d.hours()} jam ${d.minutes()} menit`;
};

const empty = {
  tanggal: "", hari: "", bulan_tahun: "",
  start_user: "", end_user: "", hasil_durasi_user: "",
  start_ticket: "", end_ticket: "", hasil_durasi_ticket: "",
  selisih_start: "",
  problem: "", action: "", material_terpakai: "", pic: "", nomor_ticket: "",
  latlong: "", latlong2: ""
};

const FIELDS_TO_SEND = [
  "tanggal", "hari", "bulan_tahun",
  "start_user", "end_user", "hasil_durasi_user",
  "start_ticket", "end_ticket", "hasil_durasi_ticket",
  "problem", "action", "material_terpakai", "pic", "nomor_ticket",
  "latlong", "latlong2", "selisih_start"
];

export function Osp() {
  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useTicket, setUseTicket] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchData();
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try { setForm(prev => ({ ...prev, ...JSON.parse(saved) })); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(form));
  }, [form]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${endpoint}?sheet=maintenance`);
      setRows(data.records || []);
    } catch (e) {
      console.error(e);
      setError("Gagal memuat data");
    }
  };

  const update = ({ target: { name, value } }) => {
    setForm(prev => {
      const n = { ...prev, [name]: value };
      if (name === "tanggal") {
        const d = new Date(value);
        n.hari = d.toLocaleDateString("id-ID", { weekday: "long" });
        n.bulan_tahun = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      }
      const tgl = n.tanggal;
      const mU = dt(tgl, n.start_user);
      const sU = dt(tgl, n.end_user);
      const mT = dt(tgl, n.start_ticket);
      const sT = dt(tgl, n.end_ticket);
      n.hasil_durasi_user = durasi(mU, sU);
      n.hasil_durasi_ticket = durasi(mT, sT);
      n.selisih_start = durasi(mU, mT);
      return n;
    });
  };


  const handlePhotoChange = (e, field) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Try to get navigator.geolocation position
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung oleh browser ini.");
      return;
    }

    // Inform user (optional) and request position
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setForm(prev => ({ ...prev, [field]: coords }));
      },
      err => {
        console.error("Geolocation error:", err);
        alert("Tidak dapat mengambil lokasi. Pastikan izin lokasi diaktifkan.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Reset input so same file can be selected later if needed
    e.target.value = null;
  };

  const send = async (dataToSend, isEdit = false, index = null) => {
    const body = new URLSearchParams();
    body.append("sheet", "maintenance");
    if (isEdit && index !== null) {
      body.append("edit", "edit");
      body.append("index", index);
    }
    FIELDS_TO_SEND.forEach(k => body.append(k, dataToSend[k] ?? ""));
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "GAS error");
  };

  const submit = async (e) => {
    e.preventDefault();
    const dataToSend = {
      ...form,
      ...(useTicket ? {} : {
        start_ticket: "", end_ticket: "",
        hasil_durasi_ticket: "", selisih_start: ""
      })
    };
    setLoading(true);
    setError("");
    try {
      await send(dataToSend);
      setForm(empty);
      localStorage.removeItem(LOCAL_KEY);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal kirim data");
    } finally {
      setLoading(false);
    }
  };

  const delLocal = (i) => {
    if (!confirm("Hapus baris ini dari tampilan?")) return;
    setRows(r => r.filter((_, idx) => idx !== i));
  };

  const startEdit = (index) => {
    setEditIndex(index);
    setEditForm(rows[index]);
  };

  const updateEditField = ({ target: { name, value } }) => {
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    try {
      const indexSheet = editIndex + 2;
      await send(editForm, true, indexSheet);
      setEditIndex(null);
      setEditForm({});
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditForm({});
  };


  const downloadCSV = () => {
    if (!rows.length) {
      alert("Tidak ada data untuk diunduh");
      return;
    }

    const headers = Array.from(rows.reduce((s, r) => {
      Object.keys(r || {}).forEach(k => s.add(k));
      return s;
    }, new Set()));

    const csv = [
      headers.join(","),
      ...rows.map(row =>
        headers.map(h => {
          const v = row[h] ?? "";
          // escape quotes
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data_osp_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container className="py-4">
      <h4 className="mb-3">Gangguan / Durasi OSP</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={submit}>
            <Row className="g-3 mb-3">
              <Col xs={12} md={4}>
                <Form.Label>Tanggal</Form.Label>
                <Form.Control type="date" name="tanggal" value={form.tanggal} onChange={update} required />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label>User Start</Form.Label>
                <Form.Control type="time" name="start_user" value={form.start_user} onChange={update} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label>User End</Form.Label>
                <Form.Control type="time" name="end_user" value={form.end_user} onChange={update} />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={4}>
                <Form.Label>Durasi User</Form.Label>
                <Form.Control readOnly value={form.hasil_durasi_user} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Check
                  type="switch"
                  label="Gunakan waktu Ticket"
                  checked={useTicket}
                  onChange={e => setUseTicket(e.target.checked)}
                />
              </Col>
            </Row>

            {useTicket && (
              <Row className="g-3 mb-3">
                <Col xs={12} md={4}>
                  <Form.Label>Ticket Start</Form.Label>
                  <Form.Control type="time" name="start_ticket" value={form.start_ticket} onChange={update} />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label>Ticket End</Form.Label>
                  <Form.Control type="time" name="end_ticket" value={form.end_ticket} onChange={update} />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label>Durasi Ticket</Form.Label>
                  <Form.Control readOnly value={form.hasil_durasi_ticket} />
                </Col>
              </Row>
            )}

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Label>Problem</Form.Label>
                <Form.Control name="problem" value={form.problem} onChange={update} />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Action</Form.Label>
                <Form.Control name="action" value={form.action} onChange={update} />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={4}>
                <Form.Label>Material Terpakai</Form.Label>
                <Form.Control name="material_terpakai" value={form.material_terpakai} onChange={update} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label>PIC</Form.Label>
                <Form.Control name="pic" value={form.pic} onChange={update} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label>Nomor Ticket</Form.Label>
                <Form.Control name="nomor_ticket" value={form.nomor_ticket} onChange={update} />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Label>Upload Foto 1</Form.Label>
                <div className="d-flex gap-2 mb-2">
                  <input id="photo1Cam" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handlePhotoChange(e, "latlong")} />
                  <input id="photo1File" type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoChange(e, "latlong")} />
                  <Button size="sm" onClick={() => document.getElementById("photo1Cam").click()}>Kamera</Button>
                  <Button size="sm" variant="secondary" onClick={() => document.getElementById("photo1File").click()}>Galeri</Button>
                </div>
                <Form.Control readOnly placeholder="Lat,Long 1" value={form.latlong} />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>Upload Foto 2 </Form.Label>
                <div className="d-flex gap-2 mb-2">
                  <input id="photo2Cam" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handlePhotoChange(e, "latlong2")} />
                  <input id="photo2File" type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoChange(e, "latlong2")} />
                  <Button size="sm" onClick={() => document.getElementById("photo2Cam").click()}>Kamera</Button>
                  <Button size="sm" variant="secondary" onClick={() => document.getElementById("photo2File").click()}>Galeri</Button>
                </div>
                <Form.Control readOnly placeholder="Lat,Long 2" value={form.latlong2} />
              </Col>
            </Row>

            <Row>
              <Col md={3}>
                <Button type="submit" className="w-100" disabled={loading}>{loading ? "Mengirim…" : "Tambah"}</Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Download CSV */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>Data Maintenance</h5>
        <Button variant="success" size="sm" onClick={downloadCSV}> Download data</Button>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover size="sm" className="align-middle text-nowrap">
          <thead>
            <tr>
              {["No", "Tanggal", "User Start", "User End", "Durasi User", "Ticket Start", "Ticket End", "Durasi Ticket", "Problem", "Action", "PIC", "Nomor Ticket", "LatLong", "LatLong2", ""].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="15" className="text-center">Belum ada data</td></tr>
            ) : rows.map((r, i) => (
              editIndex === i ? (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <Form.Control
                      type="date"
                      name="tanggal"
                      value={editForm.tanggal || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="time"
                      name="start_user"
                      value={editForm.start_user || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="time"
                      name="end_user"
                      value={editForm.end_user || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>{editForm.hasil_durasi_user}</td>
                  <td>
                    <Form.Control
                      type="time"
                      name="start_ticket"
                      value={editForm.start_ticket || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="time"
                      name="end_ticket"
                      value={editForm.end_ticket || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>{editForm.hasil_durasi_ticket}</td>
                  <td>
                    <Form.Control
                      name="problem"
                      value={editForm.problem || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>
                    <Form.Control
                      name="action"
                      value={editForm.action || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>
                    <Form.Control
                      name="pic"
                      value={editForm.pic || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>
                    <Form.Control
                      name="nomor_ticket"
                      value={editForm.nomor_ticket || ""}
                      onChange={updateEditField}
                    />
                  </td>
                  <td>{editForm.latlong || "-"}</td>
                  <td>{editForm.latlong2 || "-"}</td>
                  <td className="text-center">
                    <Button size="sm" variant="success" className="me-1" onClick={saveEdit}>Simpan</Button>
                    <Button size="sm" variant="secondary" onClick={cancelEdit}>Batal</Button>
                  </td>
                </tr>
              ) : (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{fmtDate(r.tanggal)}</td>
                  <td>{fmtTime(r.start_user)}</td>
                  <td>{fmtTime(r.end_user)}</td>
                  <td>{r.hasil_durasi_user}</td>
                  <td>{fmtTime(r.start_ticket)}</td>
                  <td>{fmtTime(r.end_ticket)}</td>
                  <td>{r.hasil_durasi_ticket}</td>
                  <td style={{ maxWidth: 180, whiteSpace: "normal" }}>{r.problem}</td>
                  <td style={{ maxWidth: 180, whiteSpace: "normal" }}>{r.action}</td>
                  <td>{r.pic}</td>
                  <td>{r.nomor_ticket}</td>
                  <td>{r.latlong || "-"}</td>
                  <td>{r.latlong2 || "-"}</td>
                  <td className="text-center">
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => startEdit(i)}><PencilSquare /></Button>
                    <Button size="sm" variant="outline-danger" onClick={() => delLocal(i)}><X /></Button>
                  </td>
                </tr>
              )
            ))}
          </tbody>

        </Table>
      </div>
    </Container>
  );
}

export default Osp;
