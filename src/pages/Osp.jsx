/* eslint-disable camelcase */
import axios from "axios";
import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Table,
  Card,
} from "react-bootstrap";
import { X } from "react-bootstrap-icons";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import "dayjs/locale/id";

dayjs.extend(duration);
dayjs.locale("id");

const endpoint = import.meta.env.VITE_GAS_ENDPOINT;
const LOCAL_KEY = "osp_form_cache"; // <- simpan progress form

/* ---------- util ---------- */
const formatTanggal = (t) => (t ? dayjs(t).format("DD MMMM YYYY") : "");
const formatJam = (j) => {
  const d = dayjs(j, "HH:mm");
  return d.isValid() ? d.format("HH:mm") : j;
};
const gabungTanggalJam = (tgl, jam) =>
  tgl && jam ? dayjs(`${tgl}T${jam}`) : null;
const hitungDurasi = (mulai, selesai) => {
  if (!mulai || !selesai || !mulai.isValid() || !selesai.isValid()) return "";
  const diff = selesai.diff(mulai);
  if (diff <= 0) return "";
  const d = dayjs.duration(diff);
  return `${d.hours()} jam ${d.minutes()} menit`;
};

/* ---------- state awal ---------- */
const empty = {
  tanggal: "",
  hari: "",
  bulan_tahun: "",
  start_user: "",
  end_user: "",
  hasil_durasi_user: "",
  start_ticket: "",
  end_ticket: "",
  hasil_durasi_ticket: "",
  selisih_start: "",
  problem: "",
  action: "",
  tambah_barang: "",
  pic: "",
  vendor: "",
  latlong: "",
  latlong2: "",
};

/* field yg dikirim ke Apps Script */
const FIELDS_TO_SEND = [
  "tanggal",
  "hari",
  "bulan_tahun",
  "start_user",
  "end_user",
  "hasil_durasi_user",
  "start_ticket",
  "end_ticket",
  "hasil_durasi_ticket",
  "selisih_start",
  "problem",
  "action",
  "tambah_barang",
  "pic",
  "vendor",
  "latlong",
  "latlong2",
];

function Osp() {
  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useTicket, setUseTicket] = useState(false); // <- toggle tampil Ticket

  /* ---------- load data pertama & cache ---------- */
  useEffect(() => {
    fetchData();
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {/* abaikan */}
    }
  }, []);

  /* autosave */
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(form));
  }, [form]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${endpoint}?mode=read`);
      setRows(data.records || []);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data dari Google Sheet");
    }
  };

  /* ---------- handle input ---------- */
  const update = ({ target: { name, value } }) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "tanggal") {
        const d = new Date(value);
        next.hari = d.toLocaleDateString("id-ID", { weekday: "long" });
        next.bulan_tahun = d.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });
      }

      // kalkulasi durasi & selisih
      const tgl = next.tanggal;
      const mUser = gabungTanggalJam(tgl, next.start_user);
      const sUser = gabungTanggalJam(tgl, next.end_user);
      const mTic = gabungTanggalJam(tgl, next.start_ticket);
      const sTic = gabungTanggalJam(tgl, next.end_ticket);

      next.hasil_durasi_user = hitungDurasi(mUser, sUser);
      next.hasil_durasi_ticket = hitungDurasi(mTic, sTic);
      next.selisih_start = hitungDurasi(mUser, mTic);

      return next;
    });
  };

  /* ---------- helper ambil koordinat ---------- */
  const ambilLatLong = (field) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          setForm((prev) => ({
            ...prev,
            [field]: `${coords.latitude},${coords.longitude}`,
          })),
        () => alert("Izin lokasi ditolak")
      );
    } else alert("Geolocation tidak didukung");
  };

  /* ---------- kirim ke GAS ---------- */
  const send = async (data) => {
    const body = new URLSearchParams(
      FIELDS_TO_SEND.map((k) => [k, data[k] ?? ""])
    ).toString();

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.message || "Apps Script error");
  };

  const submit = async (e) => {
    e.preventDefault();

    // jika ticket disembunyikan, kosongkan field agar tidak rancu
    const dataToSend = {
      ...form,
      ...(useTicket
        ? {}
        : {
            start_ticket: "",
            end_ticket: "",
            hasil_durasi_ticket: "",
            selisih_start: "",
          }),
    };

    setLoading(true);
    setError("");
    try {
      await send(dataToSend);
      setForm(empty);
      localStorage.removeItem(LOCAL_KEY);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- hapus lokal saja ---------- */
  const deleteLocalRow = (index) => {
    if (!window.confirm("Hapus baris ini dari tampilan?")) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---------- UI ---------- */
  return (
    <Container className="py-4">
      <h4 className="mb-3">Gangguan / Durasi OSP</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ---------- FORM ---------- */}
      <Card className="p-4 shadow-sm mb-4">
        <Form onSubmit={submit}>
          {/* Tanggal */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Tanggal</Form.Label>
              <Form.Control
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={update}
                required
              />
            </Col>
            <Col md={6}>
              <Form.Label>Hari</Form.Label>
              <Form.Control value={form.hari} readOnly />
            </Col>
            <Col md={6} className="mt-3">
              <Form.Label>Bulan/Tahun</Form.Label>
              <Form.Control value={form.bulan_tahun} readOnly />
            </Col>
          </Row>

          {/* User time */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>User Start</Form.Label>
              <Form.Control
                type="time"
                name="start_user"
                value={form.start_user}
                onChange={update}
              />
            </Col>
            <Col md={6}>
              <Form.Label>User End</Form.Label>
              <Form.Control
                type="time"
                name="end_user"
                value={form.end_user}
                onChange={update}
              />
            </Col>
            <Col md={6} className="mt-3">
              <Form.Label>Durasi User</Form.Label>
              <Form.Control value={form.hasil_durasi_user} readOnly />
            </Col>
          </Row>

          {/* Toggle Ticket */}
          <Row className="mb-3">
            <Col>
              <Form.Check
                type="switch"
                id="toggle-ticket"
                label="Gunakan waktu Ticket"
                checked={useTicket}
                onChange={(e) => setUseTicket(e.target.checked)}
              />
            </Col>
          </Row>

          {/* Ticket time (tampil kalau useTicket === true) */}
          {useTicket && (
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Ticket Start</Form.Label>
                <Form.Control
                  type="time"
                  name="start_ticket"
                  value={form.start_ticket}
                  onChange={update}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Ticket End</Form.Label>
                <Form.Control
                  type="time"
                  name="end_ticket"
                  value={form.end_ticket}
                  onChange={update}
                />
              </Col>
              <Col md={6} className="mt-3">
                <Form.Label>Durasi Ticket</Form.Label>
                <Form.Control value={form.hasil_durasi_ticket} readOnly />
              </Col>

              <Col md={6} className="mt-3">
                <Form.Label>
                  Selisih Start (start_Ticket - start_user)
                </Form.Label>
                <Form.Control value={form.selisih_start} readOnly />
              </Col>
            </Row>
          )}

          {/* Problem & Action */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Problem</Form.Label>
              <Form.Control name="problem" value={form.problem} onChange={update} />
            </Col>
            <Col md={6}>
              <Form.Label>Action</Form.Label>
              <Form.Control name="action" value={form.action} onChange={update} />
            </Col>
          </Row>

          {/* Tambahan */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Tambah Barang</Form.Label>
              <Form.Control
                name="tambah_barang"
                value={form.tambah_barang}
                onChange={update}
              />
            </Col>
            <Col md={6}>
              <Form.Label>PIC</Form.Label>
              <Form.Control name="pic" value={form.pic} onChange={update} />
            </Col>
            <Col md={6} className="mt-3">
              <Form.Label>Nomor Ticket</Form.Label>
              <Form.Control name="Nomor Ticket" value={form.Nomor_Ticket} onChange={update} />
            </Col>
          </Row>

          {/* Upload Foto 1 */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Upload Foto 1</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (!e.target.files.length) return;
                  ambilLatLong("latlong");
                }}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Lat,Long 1</Form.Label>
              <Form.Control value={form.latlong} readOnly />
            </Col>
          </Row>

          {/* Upload Foto 2 */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Upload Foto 2</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (!e.target.files.length) return;
                  ambilLatLong("latlong2");
                }}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Lat,Long 2</Form.Label>
              <Form.Control value={form.latlong2} readOnly />
            </Col>
          </Row>

          <Row>
            <Col md={3}>
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? "Mengirim…" : "Tambah"}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ---------- TABEL ---------- */}
      <Table striped bordered hover size="sm" responsive>
        <thead>
          <tr>
            {[
              "No",
              "Tanggal",
              "User Start",
              "User End",
              "Durasi User",
              "Ticket Start",
              "Ticket End",
              "Durasi Ticket",
              "Problem",
              "Action",
              "PIC",
              "Vendor",
              "Aksi",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.tanggal}-${i}`}>
              <td>{i + 1}</td>
              <td>{formatTanggal(r.tanggal)}</td>
              <td>{formatJam(r.start_user)}</td>
              <td>{formatJam(r.end_user)}</td>
              <td>{r.hasil_durasi_user}</td>
              <td>{formatJam(r.start_ticket)}</td>
              <td>{formatJam(r.end_ticket)}</td>
              <td>{r.hasil_durasi_ticket}</td>
              <td>{r.problem}</td>
              <td>{r.action}</td>
              <td>{r.pic}</td>
              <td>{r.vendor}</td>
              <td className="text-center">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => deleteLocalRow(i)}
                  title="Hapus dari tampilan"
                >
                  <X />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Osp;
