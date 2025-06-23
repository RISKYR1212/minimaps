import React, { useState } from "react";
import {
  Container,
  Form,
  Button,
  Table,
  Row,
  Col,
  ButtonGroup,
} from "react-bootstrap";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const initialForm = {
  tanggal: "",
  hari: "",
  bulanTahun: "",
  startTime: "",
  endTime: "",
  duration: "",
  startAction: "",
  finishAction: "",
  lokasi: "",
  deskripsi: "",
  serviceImpact: "",
  klasifikasi: "",
  rootCause: "",
  segment: "",
  pic: "",
  vendor: "",
};

const Osp = () => {
  const [ospData, setOspData] = useState([]);
  const [form, setForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = {
      ...form,
      [name]: value,
    };

    if (name === "startTime" || name === "endTime") {
      const start = name === "startTime" ? value : form.startTime;
      const end = name === "endTime" ? value : form.endTime;
      if (start && end) {
        updatedForm.duration = calculateDuration(start, end);
      }
    }

    setForm(updatedForm);
  };

  const calculateDuration = (start, end) => {
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    const startMinutes = h1 * 60 + m1;
    const endMinutes = h2 * 60 + m2;
    const diff = endMinutes - startMinutes;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours} jam ${minutes} menit`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await sendToGoogleSheet(form);
      if (response.ok) {
        setOspData((prev) => [...prev, form]);
        setForm(initialForm);
      } else {
        console.error(" Gagal kirim ke Google Sheets:", response.status);
      }
    } catch (error) {
      console.error(" Error kirim ke Google Sheets:", error);
    }
  };

  const url = "https://script.google.com/macros/s/AKfycbxyv9FfTmoR1rJjKJhIWNfxqghdFdHHKmSJAszE2-Y/dev";

  const sendToGoogleSheet = async (data) => {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };


  const exportPDF = () => {
    const input = document.getElementById("osp-report");
    html2canvas(input).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      pdf.addImage(img, "PNG", 10, 10, 280, 0);
      pdf.save("laporan_osp.pdf");
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(ospData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Gangguan");
    XLSX.writeFile(wb, "laporan_osp.xlsx");
  };

  return (
    <Container className="mt-4">
      <h2 className="text-center mb-4">Laporan Gangguan Jaringan OSP</h2>

      <Form onSubmit={handleSubmit} className="mb-4">
        <Row className="mb-2">
          <Col md={2}>
            <Form.Control type="date" name="tanggal" value={form.tanggal} onChange={handleChange} required />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="hari" placeholder="Hari" value={form.hari} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="bulanTahun" placeholder="Bulan / Tahun" value={form.bulanTahun} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="time" name="startTime" value={form.startTime} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="time" name="endTime" value={form.endTime} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="duration" placeholder="Duration" value={form.duration} readOnly />
          </Col>
        </Row>

        <Row className="mb-2">
          <Col md={2}>
            <Form.Control type="text" name="startAction" placeholder="Start Action" value={form.startAction} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="finishAction" placeholder="Finish Action" value={form.finishAction} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="lokasi" placeholder="Lokasi" value={form.lokasi} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="segment" placeholder="Segment" value={form.segment} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="deskripsi" placeholder="Deskripsi" value={form.deskripsi} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="serviceImpact" placeholder="Service Impact" value={form.serviceImpact} onChange={handleChange} />
          </Col>
        </Row>

        <Row className="mb-2">
          <Col md={2}>
            <Form.Control type="text" name="klasifikasi" placeholder="Klasifikasi" value={form.klasifikasi} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="rootCause" placeholder="Root Cause" value={form.rootCause} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="pic" placeholder="PIC" value={form.pic} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" name="vendor" placeholder="Vendor/Mandor" value={form.vendor} onChange={handleChange} />
          </Col>
        </Row>

        <Button type="submit">Tambah</Button>
      </Form>

      <ButtonGroup className="mb-3">
        <Button variant="success" onClick={exportExcel}>Export Excel</Button>
        <Button variant="danger" onClick={exportPDF}>Export PDF</Button>
      </ButtonGroup>

      <div id="osp-report">
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Hari</th>
              <th>Bulan/Tahun</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Start Action</th>
              <th>Finish Action</th>
              <th>Lokasi</th>
              <th>Segment</th>
              <th>Deskripsi</th>
              <th>Service Impact</th>
              <th>Klasifikasi</th>
              <th>Root Cause</th>
              <th>PIC</th>
              <th>Vendor</th>
            </tr>
          </thead>
          <tbody>
            {ospData.map((d, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{d.tanggal}</td>
                <td>{d.hari}</td>
                <td>{d.bulanTahun}</td>
                <td>{d.startTime}</td>
                <td>{d.endTime}</td>
                <td>{d.duration}</td>
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
