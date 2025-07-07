// React 18 + Vite + React‑Bootstrap 5
import React, { useState } from "react";
import {
  Container, Row, Col, Form, Button, ButtonGroup, Table,
} from "react-bootstrap";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const initialForm = {
  // metadata
  tanggal: "",
  hari: "",
  bulanTahun: "",

  // ---------- ACTION USER TEAM ----------
  userStart: "",
  userEnd:   "",
  userDuration: "",

  // ---------- TURUN TICKET ----------
  ticketStart: "",
  ticketEnd:   "",
  ticketDuration: "",

  // info lain
  startAction:  "",
  finishAction: "",
  lokasi:       "",
  deskripsi:    "",
  serviceImpact:"",
  klasifikasi:  "",
  rootCause:    "",
  segment:      "",
  pic:          "",
  vendor:       "",
};

const Osp = () => {
  // UI STATE
  const [form, setForm]       = useState(initialForm);
  const [ospData, setOspData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  /* ---------- helper ---------- */
  const calcDuration = (start, end) => {
    if (!start || !end) return "";
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;              // lewat tengah malam
    const hh = Math.floor(diff / 60);
    const mm = diff % 60;
    return `${hh} jam ${mm} menit`;
  };

  /* ---------- onChange (versi baru) ---------- */
  const handleChange = ({ target: { name, value } }) => {
    setForm(prev => {
      const next = { ...prev, [name]: value };

      // Otomatis isi HARI + BULAN/TAHUN ketika tanggal diganti
      if (name === "tanggal" && value) {
        const d = new Date(value);
        next.hari       = d.toLocaleDateString("id-ID", { weekday: "long" });
        next.bulanTahun = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      }

      // Hitung kedua durasi setiap kali jam terkait berubah
      next.userDuration   = calcDuration(next.userStart,   next.userEnd);
      next.ticketDuration = calcDuration(next.ticketStart, next.ticketEnd);

      return next;
    });
  };

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { ok, message } = await sendToGoogleSheet(form);
      if (!ok) throw new Error(message || "Apps Script reply not ok");

      setOspData(prev => [...prev, form]);
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setError("Gagal mengirim data ke Google Sheet");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- fetch to GAS ---------- */
  const GAS_ENDPOINT = import.meta.env.VITE_GAS_ENDPOINT;

  const sendToGoogleSheet = async (payload) => {
    const res = await fetch(GAS_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    return res.json();   // { ok:true } dari Apps Script
  };

  /* ---------- exporters ---------- */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(ospData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan OSP");
    XLSX.writeFile(wb, "laporan_osp.xlsx");
  };

  const exportPDF = () => {
    const node = document.getElementById("osp-report");
    html2canvas(node).then((canvas) => {
      const pdf = new jsPDF("l", "mm", "a4");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, 280, 0);
      pdf.save("laporan_osp.pdf");
    });
  };

  /* ---------- render ---------- */
  return (
    <Container className="mt-4">
      <h2 className="text-center mb-4">Laporan Gangguan Jaringan OSP</h2>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <Form onSubmit={handleSubmit} className="mb-4">
        {/* ---- Metadata ---- */}
        <Row className="g-2 mb-2">
          <Col md={2}>
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
              placeholder="Hari"
              value={form.hari}
              onChange={handleChange}
              readOnly         // sekarang auto‑fill
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="text"
              name="bulanTahun"
              placeholder="Bulan/Tahun"
              value={form.bulanTahun}
              onChange={handleChange}
              readOnly
            />
          </Col>
        </Row>

        {/* ---- ACTION USER ---- */}
        <h6>Waktu Action User</h6>
        <Row className="g-2 mb-2">
          <Col md={2}>
            <Form.Control type="time" name="userStart"  value={form.userStart}  onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="time" name="userEnd"    value={form.userEnd}    onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="userDuration" value={form.userDuration} readOnly />
          </Col>
        </Row>

        {/* ---- TURUN TICKET ---- */}
        <h6>Waktu Turun Ticket</h6>
        <Row className="g-2 mb-2">
          <Col md={2}>
            <Form.Control type="time" name="ticketStart" value={form.ticketStart} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="time" name="ticketEnd"   value={form.ticketEnd}   onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="ticketDuration" value={form.ticketDuration} readOnly />
          </Col>
        </Row>

        {/* ---- Detail lain ---- */}
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="text" name="startAction"   placeholder="Start Action"   value={form.startAction}   onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="finishAction"  placeholder="Finish Action"  value={form.finishAction}  onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="lokasi"        placeholder="Lokasi"         value={form.lokasi}        onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="segment"       placeholder="Segment"        value={form.segment}       onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="deskripsi"     placeholder="Deskripsi"      value={form.deskripsi}     onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="serviceImpact" placeholder="Service Impact" value={form.serviceImpact} onChange={handleChange} /></Col>
        </Row>

        <Row className="g-2 mb-3">
          <Col md={2}><Form.Control type="text" name="klasifikasi" placeholder="Klasifikasi" value={form.klasifikasi} onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="rootCause"   placeholder="Root Cause" value={form.rootCause}   onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="pic"         placeholder="PIC"         value={form.pic}         onChange={handleChange} /></Col>
          <Col md={2}><Form.Control type="text" name="vendor"      placeholder="Vendor"      value={form.vendor}      onChange={handleChange} /></Col>
          <Col md={4} className="d-flex align-items-end">
            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? "Mengirim..." : "Tambah"}
            </Button>
          </Col>
        </Row>
      </Form>

      {/* ---- Export buttons ---- */}
      <ButtonGroup className="mb-3">
        <Button variant="success" onClick={exportExcel}>Download Excel</Button>
        <Button variant="danger"  onClick={exportPDF} >Download PDF</Button>
      </ButtonGroup>

      {/* ---- Tabel ---- */}
      <div id="osp-report">
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              {[
                "No", "Tanggal", "Hari", "Bulan/Tahun",
                "User Start", "User End", "Durasi User",
                "Ticket Start", "Ticket End", "Durasi Ticket",
                "Start Action", "Finish Action", "Lokasi", "Segment",
                "Deskripsi", "Service Impact", "Klasifikasi", "Root Cause",
                "PIC", "Vendor",
              ].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {ospData.map((d, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{d.tanggal}</td>
                <td>{d.hari}</td>
                <td>{d.bulanTahun}</td>
                <td>{d.userStart}</td>
                <td>{d.userEnd}</td>
                <td>{d.userDuration}</td>
                <td>{d.ticketStart}</td>
                <td>{d.ticketEnd}</td>
                <td>{d.ticketDuration}</td>
                <td>{d.startAction}</td>
                <td>{d.finishAction}</td>
                <td>{d.lokasi}</td>
                <td>{d.segment}</td>
                <td>{d.deskripsi}</td>
                <td>{d.serviceImpact}</td>
                <td>{d.klasifikasi}</td>
                <td>{d.rootCause}</td>
                <td>{d.pic}</td>
                <td>{d.vendor}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default Osp;
