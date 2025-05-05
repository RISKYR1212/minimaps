import React, { useState } from "react";
import {
  Container,
  Form,
  Button,
  Table,
  Row,
  Col,
  Image,
  ButtonGroup,
} from "react-bootstrap";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const Osp = () => {
  const [ospData, setOspData] = useState([]);
  const [form, setForm] = useState({
    tanggal: "",
    startTime: "",
    endTime: "",
    lokasi: "",
    deskripsi: "",
    foto: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setOspData([...ospData, form]);
    setForm({
      tanggal: "",
      startTime: "",
      endTime: "",
      lokasi: "",
      deskripsi: "",
      foto: null,
    });
  };

  const exportPDF = () => {
    const input = document.getElementById("osp-report");
    html2canvas(input).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      pdf.addImage(img, "PNG", 10, 10, 190, 0);
      pdf.save("laporan_osp.pdf");
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      ospData.map(({ foto, ...d }) => d) // remove File object
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OSP Report");
    XLSX.writeFile(wb, "laporan_osp.xlsx");
  };

  return (
    <Container className="mt-4">
      <h2 className="text-center mb-4">Laporan Gangguan Jaringan OSP</h2>

      <Form onSubmit={handleSubmit} className="mb-4">
        <Row>
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
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              required
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              required
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="text"
              name="lokasi"
              placeholder="Lokasi"
              value={form.lokasi}
              onChange={handleChange}
              required
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="text"
              name="deskripsi"
              placeholder="Deskripsi"
              value={form.deskripsi}
              onChange={handleChange}
              required
            />
          </Col>
          <Col md={2}>
            <Form.Control type="file" name="foto" onChange={handleChange} />
          </Col>
        </Row>
        <Button type="submit" className="mt-2">
          Tambah
        </Button>
      </Form>

      <ButtonGroup className="mb-3">
        <Button variant="success" onClick={exportExcel}>
          Export Excel
        </Button>
        <Button variant="danger" onClick={exportPDF}>
          Export PDF
        </Button>
      </ButtonGroup>

      <div id="osp-report">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Start</th>
              <th>End</th>
              <th>Lokasi</th>
              <th>Deskripsi</th>
              <th>Foto</th>
            </tr>
          </thead>
          <tbody>
            {ospData.map((d, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{d.tanggal}</td>
                <td>{d.startTime}</td>
                <td>{d.endTime}</td>
                <td>{d.lokasi}</td>
                <td>{d.deskripsi}</td>
                <td>
                  {d.foto && (
                    <Image
                      src={URL.createObjectURL(d.foto)}
                      width={80}
                      thumbnail
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default Osp;
