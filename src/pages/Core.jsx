import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Button, Table, Form, Container, Row, Col } from "react-bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "leaflet/dist/leaflet.css";

const CoreManagementApp = () => {
  const [cables, setCables] = useState([]);
  const [newCable, setNewCable] = useState({ name: "", cores: 12 });
  const [coreStatus, setCoreStatus] = useState([]);
  const [splicePairs, setSplicePairs] = useState([]);
  const [newSplice, setNewSplice] = useState({ from: "", to: "" });
  const [splitters, setSplitters] = useState([]);
  const [newSplitter, setNewSplitter] = useState({ name: "", ports: 8 });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("core_data"));
    if (saved) {
      setCables(saved.cables || []);
      setCoreStatus(saved.coreStatus || []);
      setSplicePairs(saved.splicePairs || []);
      setSplitters(saved.splitters || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "core_data",
      JSON.stringify({ cables, coreStatus, splicePairs, splitters })
    );
  }, [cables, coreStatus, splicePairs, splitters]);

  const addCable = () => {
    const cores = Array.from({ length: parseInt(newCable.cores) }, (_, i) => ({
      coreId: `${newCable.name}-C${i + 1}`,
      status: "Available",
    }));
    setCables([...cables, { ...newCable }]);
    setCoreStatus([...coreStatus, ...cores]);
    setNewCable({ name: "", cores: 12 });
  };

  const toggleCore = (coreId) => {
    setCoreStatus((prev) =>
      prev.map((c) => (c.coreId === coreId ? { ...c, status: c.status === "Available" ? "Used" : "Available" } : c))
    );
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(coreStatus);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CoreStatus");
    XLSX.writeFile(wb, "core-status.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Core Status", 10, 10);
    coreStatus.forEach((core, index) => {
      doc.text(`${core.coreId}: ${core.status}`, 10, 20 + index * 6);
    });
    doc.save("core-status.pdf");
  };

  const addSplice = () => {
    if (newSplice.from && newSplice.to) {
      setSplicePairs([...splicePairs, { from: newSplice.from, to: newSplice.to }]);
      setNewSplice({ from: "", to: "" });
    }
  };

  const addSplitter = () => {
    const ports = Array.from({ length: parseInt(newSplitter.ports) }, (_, i) => ({
      splitterId: `${newSplitter.name}-P${i + 1}`,
      status: "Empty",
    }));
    setSplitters([...splitters, { name: newSplitter.name, ports }]);
    setNewSplitter({ name: "", ports: 8 });
  };

  return (
    <Container fluid>
      <h3 className="mt-3"> Aplikasi Web Manajemen Core FTTH ISP</h3>
      <Row className="mt-4">
        <Col md={4}>
          <h5>➕ Tambah Kabel</h5>
          <Form>
            <Form.Group>
              <Form.Label>Nama Kabel</Form.Label>
              <Form.Control value={newCable.name} onChange={(e) => setNewCable({ ...newCable, name: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Jumlah Core</Form.Label>
              <Form.Control type="number" value={newCable.cores} onChange={(e) => setNewCable({ ...newCable, cores: e.target.value })} />
            </Form.Group>
            <Button className="mt-2" onClick={addCable}>Tambah</Button>
          </Form>

          <h5 className="mt-4"> Splicing Core</h5>
          <Form>
            <Form.Group>
              <Form.Label>Dari Core</Form.Label>
              <Form.Control value={newSplice.from} onChange={(e) => setNewSplice({ ...newSplice, from: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Ke Core</Form.Label>
              <Form.Control value={newSplice.to} onChange={(e) => setNewSplice({ ...newSplice, to: e.target.value })} />
            </Form.Group>
            <Button className="mt-2" onClick={addSplice}>Splice</Button>
          </Form>

          <h5 className="mt-4"> Splitter/ODP</h5>
          <Form>
            <Form.Group>
              <Form.Label>Nama Splitter</Form.Label>
              <Form.Control value={newSplitter.name} onChange={(e) => setNewSplitter({ ...newSplitter, name: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Jumlah Port</Form.Label>
              <Form.Control type="number" value={newSplitter.ports} onChange={(e) => setNewSplitter({ ...newSplitter, ports: e.target.value })} />
            </Form.Group>
            <Button className="mt-2" onClick={addSplitter}>Tambah</Button>
          </Form>

          <h5 className="mt-4">📋 Status Core</h5>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Core ID</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {coreStatus.map((core, idx) => (
                <tr key={idx}>
                  <td>{core.coreId}</td>
                  <td>{core.status}</td>
                  <td>
                    <Button size="sm" variant={core.status === "Available" ? "success" : "danger"} onClick={() => toggleCore(core.coreId)}>
                      Toggle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button variant="warning" onClick={exportToExcel}>⬇ Export ke Excel</Button>{" "}
          <Button variant="info" onClick={exportToPDF}> Export ke PDF</Button>
        </Col>

        <Col md={8}>
          <h5> Peta Kabel</h5>
          <MapContainer center={[-6.2, 106.8]} zoom={12} style={{ height: "500px", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {cables.map((cable, idx) => (
              <Marker position={[-6.2 + idx * 0.01, 106.8 + idx * 0.01]} key={idx}>
                <Popup>{cable.name} - {cable.cores} core</Popup>
              </Marker>
            ))}
          </MapContainer>

          <h5 className="mt-4"> Sambungan Splice</h5>
          <Table striped bordered size="sm">
            <thead>
              <tr>
                <th>Dari</th>
                <th>Ke</th>
              </tr>
            </thead>
            <tbody>
              {splicePairs.map((pair, idx) => (
                <tr key={idx}>
                  <td>{pair.from}</td>
                  <td>{pair.to}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h5 className="mt-4">📡 Data Splitter/ODP</h5>
          {splitters.map((splitter, idx) => (
            <div key={idx}>
              <strong>{splitter.name}</strong>
              <Table size="sm" bordered>
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {splitter.ports.map((port, pidx) => (
                    <tr key={pidx}>
                      <td>{port.splitterId}</td>
                      <td>{port.status}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))}
        </Col>
      </Row>
    </Container>
  );
};

export default CoreManagementApp;
