// src/pages/Optimalisasi.jsx
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Card, Table, Spinner, } from "react-bootstrap";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

const Optimalisasi = () => {
  const [form, setForm] = useState({
    date: "",
    pic: "",
    site: "",
    material: "",
    unit: "",
    saldoAwal: "",
    terpakai: "",
    dismantle: "",
    _index: null,
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 🔹 Ambil data dari Google Sheets
  const fetchData = async () => {
  try {
    const res = await fetch(`${endpoint}?sheet=optimalisasi`);
    const json = await res.json();
    if (json.ok && Array.isArray(json.records)) {
      setData(json.records.reverse());
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
};


  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Input handler
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Simpan data (Tambah/Edit)
  const handleAdd = async () => {
    const {
      date,
      pic,
      site,
      material,
      unit,
      saldoAwal,
      terpakai,
      dismantle,
      _index,
    } = form;

    if (
      !date ||
      !pic ||
      !site ||
      !material ||
      !unit ||
      saldoAwal === "" ||
      terpakai === ""
    ) {
      alert("Mohon lengkapi semua kolom wajib!");
      return;
    }

    const sisa = Number(saldoAwal) - Number(terpakai);
    const payload = {
  sheet: "optimalisasi",   
  date,
  pic,
  site,
  material,
  unit,
  saldo_awal: saldoAwal,
  terpakai,
  sisa,
  dismantle,
};


    if (editMode && _index !== null) {
      payload.edit = "edit";
      payload.index = _index;
    }

    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload),
      });
      const result = await res.json();
      if (result.ok) {
        fetchData();
        setForm({
          date: "",
          pic: "",
          site: "",
          material: "",
          unit: "",
          saldoAwal: "",
          terpakai: "",
          dismantle: "",
          _index: null,
        });
        setEditMode(false);
        alert(editMode ? "Data berhasil diedit!" : "Data berhasil ditambahkan!");
      } else {
        alert("Gagal menyimpan data ke Sheet");
      }
    } catch (err) {
      console.error("POST Error:", err);
      alert("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Edit data
  const handleEdit = (row) => {
    setForm({
      ...row,
      saldoAwal: row.saldo_awal,
      _index: row._index,
    });
    setEditMode(true);
  };

  // 🔹 Batalkan edit
  const handleCancelEdit = () => {
    setForm({
      date: "",
      pic: "",
      site: "",
      material: "",
      unit: "",
      saldoAwal: "",
      terpakai: "",
      dismantle: "",
      _index: null,
    });
    setEditMode(false);
  };

  // 🔹 Export ke Excel
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Optimalisasi");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Laporan_Optimalisasi.xlsx");
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Laporan Material Optimalisasi ODP </h2>
      <Card className="p-3 mb-4">
        <Row>
          <Col md={3}>
            <Form.Group className="mb-2">
              <Form.Label>Tanggal</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-2">
              <Form.Label>PIC</Form.Label>
              <Form.Control
                type="text"
                name="pic"
                value={form.pic}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-2">
              <Form.Label>Site</Form.Label>
              <Form.Control
                type="text"
                name="site"
                value={form.site}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-2">
              <Form.Label>Material</Form.Label>
              <Form.Control
                type="text"
                name="material"
                value={form.material}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={2}>
            <Form.Group className="mb-2">
              <Form.Label>Unit</Form.Label>
              <Form.Control
                type="text"
                name="unit"
                value={form.unit}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group className="mb-2">
              <Form.Label>Saldo Awal</Form.Label>
              <Form.Control
                type="number"
                name="saldoAwal"
                value={form.saldoAwal}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group className="mb-2">
              <Form.Label>Terpakai</Form.Label>
              <Form.Control
                type="number"
                name="terpakai"
                value={form.terpakai}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group className="mb-2">
              <Form.Label>Sisa</Form.Label>
              <Form.Control
                type="number"
                value={
                  form.saldoAwal && form.terpakai
                    ? Number(form.saldoAwal) - Number(form.terpakai)
                    : ""
                }
                placeholder="Auto"
                disabled
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group className="mb-2">
              <Form.Label>Dismantle</Form.Label>
              <Form.Control
                type="number"
                name="dismantle"
                value={form.dismantle}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>
        <div className="mt-2">
          <Button onClick={handleAdd} disabled={loading} className="me-2">
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : editMode ? (
              "Simpan Perubahan"
            ) : (
              "Tambah Data"
            )}
          </Button>
          {editMode && (
            <Button variant="secondary" onClick={handleCancelEdit}>
              Batal
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-3">
        <Button onClick={handleExport} className="mb-3">
          Export Excel
        </Button>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>PIC</th>
              <th>Site</th>
              <th>Material</th>
              <th>Unit</th>
              <th>Saldo Awal</th>
              <th>Terpakai</th>
              <th>Sisa</th>
              <th>Dismantle</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.date}</td>
                <td>{row.pic}</td>
                <td>{row.site}</td>
                <td>{row.material}</td>
                <td>{row.unit}</td>
                <td>{row.saldo_awal}</td>
                <td>{row.terpakai}</td>
                <td>{row.sisa}</td>
                <td>{row.dismantle}</td>
                <td>
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => handleEdit(row)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
};

export default Optimalisasi;
