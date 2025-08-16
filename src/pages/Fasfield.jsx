import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import axios from "axios";
import logoURL from "../assets/logo-jlm.jpeg";
import { Container, Row, Col, Form, Button, Card, Image, Modal, Table } from "react-bootstrap";

const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

export function Fasfield() {
  const [form, setForm] = useState({
    tanggal: "",
    waktu: "",
    lokasi: "",
    temuan: "",
    tindakan: "",
    petugas: "",
    latlong: "",
    foto: null
  });

  const [data, setData] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Ambil data dari Google Sheets
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${endpoint}?sheet=patrolli`);
      setData(res.data);
    } catch (err) {
      console.error("Gagal ambil data", err);
    }
  };

  // Tangani perubahan form
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "foto" && files.length > 0) {
      setForm({ ...form, foto: files[0] });
      setPreviewImage(URL.createObjectURL(files[0]));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Ambil lokasi GPS
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlong = `${pos.coords.latitude}, ${pos.coords.longitude}`;
          setForm({ ...form, latlong });
        },
        (err) => {
          console.error("Gagal ambil lokasi", err);
        }
      );
    }
  };

  // Simpan data (Tambah/Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, foto: null }; // foto tidak dikirim ke Sheets
      if (editIndex !== null) {
        payload.index = editIndex;
        payload.mode = "edit";
      } else {
        payload.mode = "add";
      }

      await axios.post(endpoint, {
        sheet: "patrolli",
        data: payload
      });

      fetchData();
      resetForm();
    } catch (err) {
      console.error("Gagal simpan data", err);
    }
  };

  // Hapus data
  const handleDelete = async (index) => {
    try {
      await axios.post(endpoint, {
        sheet: "patrolli",
        mode: "delete",
        index
      });
      fetchData();
    } catch (err) {
      console.error("Gagal hapus data", err);
    }
  };

  // Edit data
  const handleEdit = (row, index) => {
    setForm(row);
    setEditIndex(index);
    setPreviewImage(null);
  };

  // Reset form
  const resetForm = () => {
    setForm({
      tanggal: "",
      waktu: "",
      lokasi: "",
      temuan: "",
      tindakan: "",
      petugas: "",
      latlong: "",
      foto: null
    });
    setEditIndex(null);
    setPreviewImage(null);
  };

  // Generate PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.addImage(logoURL, "JPEG", 10, 10, 30, 30);
    doc.text("Laporan Patroli", 50, 20);
    doc.text(`Tanggal: ${form.tanggal}`, 10, 50);
    doc.text(`Waktu: ${form.waktu}`, 10, 60);
    doc.text(`Lokasi: ${form.lokasi}`, 10, 70);
    doc.text(`Temuan: ${form.temuan}`, 10, 80);
    doc.text(`Tindakan: ${form.tindakan}`, 10, 90);
    doc.text(`Petugas: ${form.petugas}`, 10, 100);
    doc.text(`Koordinat: ${form.latlong}`, 10, 110);

    if (previewImage) {
      doc.addImage(previewImage, "JPEG", 10, 120, 80, 60);
    }
    doc.save("laporan_patroli.pdf");
  };

  return (
    <Container>
      <h3 className="mt-3">Form Laporan Patroli</h3>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tanggal</Form.Label>
              <Form.Control type="date" name="tanggal" value={form.tanggal} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Waktu</Form.Label>
              <Form.Control type="time" name="waktu" value={form.waktu} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Lokasi</Form.Label>
              <Form.Control type="text" name="lokasi" value={form.lokasi} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Temuan</Form.Label>
              <Form.Control as="textarea" rows={2} name="temuan" value={form.temuan} onChange={handleChange} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tindakan</Form.Label>
              <Form.Control as="textarea" rows={2} name="tindakan" value={form.tindakan} onChange={handleChange} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Petugas</Form.Label>
              <Form.Control type="text" name="petugas" value={form.petugas} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Koordinat</Form.Label>
              <Form.Control type="text" name="latlong" value={form.latlong} readOnly />
              <Button variant="secondary" size="sm" onClick={handleGetLocation} className="mt-1">
                Ambil Titik Lokasi
              </Button>
            </Form.Group>
            <Form.Group>
              <Form.Label>Foto</Form.Label>
              <Form.Control type="file" name="foto" accept="image/*" onChange={handleChange} />
            </Form.Group>
            {previewImage && <Image src={previewImage} alt="Preview" fluid className="mt-2" />}
          </Col>
        </Row>
        <Button type="submit" variant="primary" className="mt-3">
          {editIndex !== null ? "Update Data" : "Tambah Data"}
        </Button>{" "}
        <Button variant="secondary" className="mt-3" onClick={generatePDF}>
          Download PDF
        </Button>
      </Form>

      <h4 className="mt-4">Data Laporan</h4>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Waktu</th>
            <th>Lokasi</th>
            <th>Temuan</th>
            <th>Tindakan</th>
            <th>Petugas</th>
            <th>Koordinat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.tanggal}</td>
              <td>{row.waktu}</td>
              <td>{row.lokasi}</td>
              <td>{row.temuan}</td>
              <td>{row.tindakan}</td>
              <td>{row.petugas}</td>
              <td>{row.latlong}</td>
              <td>
                <Button size="sm" variant="warning" onClick={() => handleEdit(row, i)}>
                  Edit
                </Button>{" "}
                <Button size="sm" variant="danger" onClick={() => handleDelete(i)}>
                  Hapus
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Fasfield;
