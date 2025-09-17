// Project.jsx
import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.pm";
import "leaflet.pm/dist/leaflet.pm.css";
import L from "leaflet";
import { Table, Button, Container, Row, Col, Form } from "react-bootstrap";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Icon marker custom
const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [25, 25],
});

// Toolbar leaflet.pm
const PmToolbar = ({ onLineCreated, onMarkerCreated }) => {
  const map = useMap();

  useEffect(() => {
    map.pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawPolyline: true,
      drawPolygon: false,
      drawCircle: false,
      drawRectangle: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    const handleCreate = (e) => {
      if (e.shape === "Line" || e.shape === "Polyline") {
        const coords = e.layer.getLatLngs();
        onLineCreated(coords);
      }
      if (e.shape === "Marker") {
        const coord = e.layer.getLatLng();
        onMarkerCreated(coord);
      }
    };

    map.on("pm:create", handleCreate);
    return () => {
      map.off("pm:create", handleCreate);
    };
  }, [map, onLineCreated, onMarkerCreated]);

  return null;
};

// Formatter panjang otomatis m / km
const formatLength = (length) => {
  if (length >= 1000) {
    return (length / 1000).toFixed(2) + " km";
  }
  return length.toFixed(2) + " m";
};

const Project = () => {
  const [projectName, setProjectName] = useState("Project Fiber Optic");
  const [lines, setLines] = useState([]);
  const [markers, setMarkers] = useState([]);

  // Tambah polyline
  const handleLineCreated = (coords) => {
    const name = prompt("Masukkan nama kabel:");
    const price = parseFloat(prompt("Masukkan harga per meter (Rp):")) || 0;
    const length = calculateLength(coords);
    const line = {
      id: Date.now(),
      name: name || "Kabel Tanpa Nama",
      coords,
      length,
      price,
      total: length * price,
    };
    setLines((prev) => [...prev, line]);
  };

  // Tambah marker
  const handleMarkerCreated = (coord) => {
    const name = prompt("Masukkan nama titik jaringan:");
    const price = parseFloat(prompt("Masukkan harga titik (Rp):")) || 0;
    const marker = {
      id: Date.now(),
      name: name || "Titik Tanpa Nama",
      coord,
      price,
      total: price,
    };
    setMarkers((prev) => [...prev, marker]);
  };

  // Hitung panjang polyline (meter)
  const calculateLength = (coords) => {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += coords[i - 1].distanceTo(coords[i]);
    }
    return parseFloat(total.toFixed(2));
  };

  // Hitung total keseluruhan
  const totalBiaya =
    lines.reduce((sum, l) => sum + l.total, 0) +
    markers.reduce((sum, m) => sum + m.total, 0);

  // Export ke Excel
  const exportToExcel = () => {
    const lineData = lines.map((line, idx) => ({
      Project: projectName,
      Tipe: "Jalur Fiber",
      No: idx + 1,
      Nama: line.name,
      Panjang: formatLength(line.length),
      Harga_per_m: line.price,
      Total: line.total,
      Titik: JSON.stringify(line.coords.map((c) => [c.lat, c.lng])),
    }));

    const markerData = markers.map((m, idx) => ({
      Project: projectName,
      Tipe: "Titik",
      No: idx + 1,
      Nama: m.name,
      Harga: m.price,
      Total: m.total,
      Koordinat: `${m.coord.lat}, ${m.coord.lng}`,
    }));

    const totalRow = {
      Project: projectName,
      Tipe: "TOTAL",
      No: "",
      Nama: "",
      Panjang: "",
      Harga_per_m: "",
      Harga: "",
      Total: totalBiaya,
      Titik: "",
      Koordinat: "",
    };

    const ws = XLSX.utils.json_to_sheet([
      ...lineData,
      ...markerData,
      totalRow,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Project");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `${projectName}.xlsx`);
  };

  return (
    <Container fluid>
      <Row>
        <Col md={8}>
          <MapContainer
            center={[-6.2, 106.8]}
            zoom={13}
            style={{ height: "80vh", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            <PmToolbar
              onLineCreated={handleLineCreated}
              onMarkerCreated={handleMarkerCreated}
            />
            {lines.map((line) => (
              <Polyline key={line.id} positions={line.coords} color="blue">
                <Popup>
                  <b>{line.name}</b>
                  <br />
                  Panjang: {formatLength(line.length)}
                  <br />
                  Harga/m: Rp {line.price}
                  <br />
                  Total: Rp {line.total.toLocaleString()}
                </Popup>
              </Polyline>
            ))}
            {markers.map((m) => (
              <Marker key={m.id} position={m.coord} icon={markerIcon}>
                <Popup>
                  <b>{m.name}</b>
                  <br />
                  Harga: Rp {m.price}
                  <br />
                  Total: Rp {m.total.toLocaleString()}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Col>

        {/* Panel BOQ & Titik */}
        <Col md={4}>
          <h4>📌 Nama Project</h4>
          <Form.Control
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mb-3"
          />

          <h4>Bill of Quantity (BOQ)</h4>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Panjang</th>
                <th>Harga/m</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id}>
                  <td>{idx + 1}</td>
                  <td>{line.name}</td>
                  <td>{formatLength(line.length)}</td>
                  <td>Rp {line.price.toLocaleString()}</td>
                  <td>Rp {line.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h4>Titik Jaringan</h4>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Harga</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {markers.map((m, idx) => (
                <tr key={m.id}>
                  <td>{idx + 1}</td>
                  <td>{m.name}</td>
                  <td>Rp {m.price.toLocaleString()}</td>
                  <td>Rp {m.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h5 className="mt-3">
            💰 Total Keseluruhan: <b>Rp {totalBiaya.toLocaleString()}</b>
          </h5>

          <Button onClick={exportToExcel} variant="success" className="mt-2">
            Export Excel
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default Project;
