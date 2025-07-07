// src/pages/Osp.jsx
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

/* ---------- state awal ---------- */
const initialForm = {
  tanggal: "", hari: "", bulanTahun: "",
  userStart: "", userEnd: "",
  ticketStart: "", ticketEnd: "",
  problem: "", action: "",
  pic: "", vendor: "",
};

function Osp() {
  const [form, setForm] = useState(initialForm);
  const [rows, setRows] = useState(() =>
    JSON.parse(localStorage.getItem("osp") || "[]")
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* persist local */
  useEffect(() => localStorage.setItem("osp", JSON.stringify(rows)), [rows]);

  /* handle input */
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === "tanggal" && value) {
        const d = new Date(value);
        next.hari       = d.toLocaleDateString("id-ID", { weekday:"long" });
        next.bulanTahun = d.toLocaleDateString("id-ID", { month:"long", year:"numeric" });
      }
      return next;
    });
  };

  /* kirim ke Google Sheet */
  const GAS = import.meta.env.VITE_GAS_ENDPOINT;

  const send = async payload => {
    const body = new URLSearchParams(payload).toString();
    const res  = await fetch(GAS, {
      method:"POST",
      headers:{ "Content-Type":"application/x-www-form-urlencoded" },
      body
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error("Apps Script error");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await send(form);
      setRows(r => [...r, form]);
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setError("Gagal mengirim data ke Google Sheet");
    } finally { setLoading(false); }
  };

  /* ---------- UI ---------- */
  return (
    <Container className="py-4">
      <h3 className="mb-3">Laporan Gangguan OSP</h3>
      {error && <div className="alert alert-danger">{error}</div>}

      <Form onSubmit={handleSubmit} className="border p-3 rounded mb-4">

        {/* Tanggal – Hari – Bulan/Tahun */}
        <Row className="g-2 mb-3">
          <Col md={3}>
            <Form.Control
              type="date"
              name="tanggal"
              value={form.tanggal}
              onChange={handleChange}
              required
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="text"
              name="hari"
              value={form.hari}
              placeholder="Hari"
              readOnly
            />
          </Col>
          <Col md={3}>
            <Form.Control
              type="text"
              name="bulanTahun"
              value={form.bulanTahun}
              placeholder="Bulan/Tahun"
              readOnly
            />
          </Col>
        </Row>

        {/* Jam Action User */}
        <h6>Jam Action User</h6>
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="time" name="userStart" value={form.userStart} onChange={handleChange}/></Col>
          <Col md={2}><Form.Control type="time" name="userEnd"   value={form.userEnd}   onChange={handleChange}/></Col>
        </Row>

        {/* Jam Ticket Turun */}
        <h6>Jam Ticket Turun</h6>
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="time" name="ticketStart" value={form.ticketStart} onChange={handleChange}/></Col>
          <Col md={2}><Form.Control type="time" name="ticketEnd"   value={form.ticketEnd}   onChange={handleChange}/></Col>
        </Row>

        {/* Problem & Action */}
        <Row className="g-2 mb-3">
          <Col md={4}>
            <Form.Control name="problem" placeholder="Problem" value={form.problem} onChange={handleChange}/>
          </Col>
          <Col md={4}>
            <Form.Control name="action"  placeholder="Action"  value={form.action}  onChange={handleChange}/>
          </Col>
        </Row>

        {/* PIC – Vendor – Submit */}
        <Row className="g-2">
          <Col md={3}><Form.Control name="pic"    placeholder="PIC"    value={form.pic}    onChange={handleChange}/></Col>
          <Col md={3}><Form.Control name="vendor" placeholder="Vendor" value={form.vendor} onChange={handleChange}/></Col>
          <Col md={2} className="d-flex align-items-end">
            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? "Mengirim..." : "Tambah"}
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Tabel Histori */}
      <Table striped bordered hover size="sm">
        <thead>
          <tr>{[
            "No","Tanggal","Hari","Bulan/Tahun",
            "User Start","User End","Ticket Start","Ticket End",
            "Problem","Action","PIC","Vendor"
          ].map(h => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              <td>{r.tanggal}</td><td>{r.hari}</td><td>{r.bulanTahun}</td>
              <td>{r.userStart}</td><td>{r.userEnd}</td>
              <td>{r.ticketStart}</td><td>{r.ticketEnd}</td>
              <td>{r.problem}</td><td>{r.action}</td>
              <td>{r.pic}</td><td>{r.vendor}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Osp;
