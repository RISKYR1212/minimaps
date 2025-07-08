import axios from "axios";
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Table, Card } from "react-bootstrap";
import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

const formatTanggal = (tanggal) => (tanggal ? dayjs(tanggal).format("DD MMMM YYYY") : "");
const formatJam = (jam) => jam;

const empty = {
  tanggal: "",
  hari: "",
  bulan_tahun: "",
  start_user: "",
  end_user: "",
  start_ticket: "",
  end_ticket: "",
  problem: "",
  action: "",
  tambah_barang: "",
  pic: "",
  vendor: "",
};

function Osp() {
  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${endpoint}?mode=read`);
      setRows(data.records || []);
    } catch (err) {
      setError("Gagal memuat data dari Google Sheet");
    }
  };

  const update = ({ target: { name, value } }) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "tanggal") {
        const d = new Date(value);
        next.hari = d.toLocaleDateString("id-ID", { weekday: "long" });
        next.bulan_tahun = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      }
      return next;
    });
  };

  const send = async (data) => {
    const body = new URLSearchParams(data).toString();
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
    setLoading(true);
    setError("");
    try {
      await send(form);
      setForm(empty);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h4 className="mb-3">Gangguan / Durasi OSP</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <Card className="p-4 shadow-sm mb-4">
        <Form onSubmit={submit}>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Label>Tanggal</Form.Label>
              <Form.Control type="date" name="tanggal" value={form.tanggal} onChange={update} required />
            </Col>
            <Col md={2}>
              <Form.Label>Hari</Form.Label>
              <Form.Control type="text" value={form.hari} readOnly />
            </Col>
            <Col md={3}>
              <Form.Label>Bulan/Tahun</Form.Label>
              <Form.Control type="text" value={form.bulan_tahun} readOnly />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={2}>
              <Form.Label>User Start</Form.Label>
              <Form.Control type="time" name="start_user" value={form.start_user} onChange={update} />
            </Col>
            <Col md={2}>
              <Form.Label>User End</Form.Label>
              <Form.Control type="time" name="end_user" value={form.end_user} onChange={update} />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={2}>
              <Form.Label>Ticket Start</Form.Label>
              <Form.Control type="time" name="start_ticket" value={form.start_ticket} onChange={update} />
            </Col>
            <Col md={2}>
              <Form.Label>Ticket End</Form.Label>
              <Form.Control type="time" name="end_ticket" value={form.end_ticket} onChange={update} />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Label>Problem</Form.Label>
              <Form.Control name="problem" value={form.problem} onChange={update} />
            </Col>
            <Col md={4}>
              <Form.Label>Action</Form.Label>
              <Form.Control name="action" value={form.action} onChange={update} />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Label>Tambah Barang</Form.Label>
              <Form.Control name="tambah_barang" value={form.tambah_barang} onChange={update} />
            </Col>
            <Col md={3}>
              <Form.Label>PIC</Form.Label>
              <Form.Control name="pic" value={form.pic} onChange={update} />
            </Col>
            <Col md={3}>
              <Form.Label>Vendor</Form.Label>
              <Form.Control name="vendor" value={form.vendor} onChange={update} />
            </Col>
          </Row>

          <Row>
            <Col md={2}>
              <Button type="submit" disabled={loading} className="w-100">
                {loading ? "Mengirim…" : "Tambah"}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            {[
              "No", "Tanggal", "Hari", "Bulan/Tahun",
              "User Start", "User End", "Durasi User",
              "Ticket Start", "Ticket End", "Durasi Ticket",
              "Problem", "Action", "Tambah Barang", "PIC", "Vendor"
            ].map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.tanggal}-${i}`}>
              <td>{i + 1}</td>
              <td>{formatTanggal(r.tanggal)}</td>
              <td>{r.hari}</td>
              <td>{r.bulan_tahun}</td>
              <td>{formatJam(r.start_user)}</td>
              <td>{formatJam(r.end_user)}</td>
              <td>{r.hasil_durasi_user}</td>
              <td>{formatJam(r.start_ticket)}</td>
              <td>{formatJam(r.end_ticket)}</td>
              <td>{r.hasil_durasi_ticket}</td>
              <td>{r.problem}</td>
              <td>{r.action}</td>
              <td>{r.tambah_barang}</td>
              <td>{r.pic}</td>
              <td>{r.vendor}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Osp;
