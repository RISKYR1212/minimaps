import React, { useState, useEffect } from "react";
import { Card, Container, Table, Form, Button } from "react-bootstrap";

const endpoint = import.meta.env.VITE_GAS_ENDPOINT;

const allMaterials = [
  "Kabel FO ADSS 12 Core", "Kabel FO ADSS 24 Core", "Kabel FO ADSS 48 Core", "Kabel FO ADSS 96 Core",
  "Dead End 25/50", "Dead End 50/70", "Joint Closure 48", "Joint Closure 96",
  "Kabel Ties 45cm x 4,8mm Hitam @100 pcs per Pack", "Kabel Ties 25cm x 3,8mm Putih @100 pcs per Pack",
  "Kabel Ties 10cm Putih @1000 pcs per Pack", "Solasi Nitto", "Barel SC",
  "Spliter 1:4 SC", "Spliter 1:8 SC", "spliter 1:16 sc",
  "ODP Pole 16 SC Single Mode (Optical Distribution Point)"
];

const allPICs = ["KISWANTO", "ARIEF", "DENI", "AGUS SALIM", "SUHERI"];
const allUnits = ["meter", "pcs", "pack", "unit"];

const Material = () => {
  const [data, setData] = useState([]);

  const [form, setForm] = useState({
    date: "", pic: "", site: "", material: "", unit: "",
    quantity: "", saldoAwal: "", terpakai: "", dismantle: ""
  });

  // Ambil data dari Sheet saat komponen mount
  const fetchData = async () => {
    try {
      const res = await fetch(`${endpoint}?sheet=material`);
      const json = await res.json();
      if (json.ok) setData(json.records);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    const { date, pic, site, material, unit, quantity, saldoAwal, terpakai, dismantle } = form;

    if (!date || !pic || !site || !material || !unit || !quantity || saldoAwal === "" || terpakai === "") {
      alert("Mohon lengkapi semua kolom wajib!");
      return;
    }

    const sisa = Number(saldoAwal) - Number(terpakai);
    const payload = {
      sheet: "material",
      date, pic, site, material, unit, quantity,
      saldoAwal, terpakai, sisa, dismantle
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload)
      });

      const result = await res.json();
      if (result.ok) {
        // Refresh data dari Sheet
        fetchData();

        // Reset form
        setForm({
          date: "", pic: "", site: "", material: "", unit: "",
          quantity: "", saldoAwal: "", terpakai: "", dismantle: ""
        });
      } else {
        alert("Gagal menyimpan data ke Sheet");
      }
    } catch (err) {
      console.error("POST Error:", err);
    }
  };

  return (
    <Container className="py-5">
      <h2 className="mb-4">Laporan Pemakaian Material</h2>

      {/* Form Input */}
      <Card className="p-4 mb-5">
        <Form className="row g-3">
          <Form.Group className="col-md-2">
            <Form.Label>Tanggal</Form.Label>
            <Form.Control type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
          </Form.Group>

          <Form.Group className="col-md-2">
            <Form.Label>PIC</Form.Label>
            <Form.Select value={form.pic} onChange={(e) => handleChange("pic", e.target.value)}>
              <option value="">Pilih PIC</option>
              {allPICs.map((pic, i) => <option key={i} value={pic}>{pic}</option>)}
            </Form.Select>
          </Form.Group>
    
          <Form.Group className="col-md-3">
            <Form.Label>Site Gangguan</Form.Label>
            <Form.Control type="text" value={form.site} onChange={(e) => handleChange("site", e.target.value)} />
          </Form.Group>

          <Form.Group className="col-md-3">
            <Form.Label>Material</Form.Label>
            <Form.Select value={form.material} onChange={(e) => handleChange("material", e.target.value)}>
              <option value="">Pilih Material</option>
              {allMaterials.map((item, idx) => <option key={idx} value={item}>{item}</option>)}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-2">
            <Form.Label>Satuan</Form.Label>
            <Form.Select value={form.unit} onChange={(e) => handleChange("unit", e.target.value)}>
              <option value="">Pilih Satuan</option>
              {allUnits.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
            </Form.Select>
          </Form.Group>

          {/* <Form.Group className="col-md-2">
            <Form.Label>No SPB</Form.Label>
            <Form.Control type="number" value={form.quantity} onChange={(e) => handleChange("quantity", e.target.value)} />
          </Form.Group> */}

          <Form.Group className="col-md-2">
            <Form.Label>Saldo Awal</Form.Label>
            <Form.Control type="number" value={form.saldoAwal} onChange={(e) => handleChange("saldoAwal", e.target.value)} />
          </Form.Group>

          <Form.Group className="col-md-2">
            <Form.Label>Terpakai</Form.Label>
            <Form.Control type="number" value={form.terpakai} onChange={(e) => handleChange("terpakai", e.target.value)} />
          </Form.Group>

          <Form.Group className="col-md-2">
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

          <Form.Group className="col-md-2">
            <Form.Label>Dismantle</Form.Label>
            <Form.Control type="text" value={form.dismantle} onChange={(e) => handleChange("dismantle", e.target.value)} />
          </Form.Group>

          <Form.Group className="col-md-12 mt-3">
            <Button onClick={handleAdd}>Tambah</Button>
          </Form.Group>
        </Form>
      </Card>

      {/* Tabel Data */}
      <Card className="p-4">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>PIC</th>
              <th>Site</th>
              <th>Material</th>
              <th>Satuan</th>
              {/* <th>No SPB</th> */}
              <th>Saldo Awal</th>
              <th>Terpakai</th>
              <th>Sisa</th>
              <th>Dismantle</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>{item.date}</td>
                <td>{item.pic}</td>
                <td>{item.site}</td>
                <td>{item.material}</td>
                <td>{item.unit}</td>
                <td>{item.quantity}</td>
                <td>{item.saldoAwal}</td>
                <td>{item.terpakai}</td>
                <td>{item.sisa}</td>
                <td>{item.dismantle}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
};

export default Material;
