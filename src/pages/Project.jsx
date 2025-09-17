import React, { useState, useEffect, useRef } from "react";
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
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import * as toGeoJSON from "@mapbox/togeojson";

// custom marker icon
const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [25, 25],
});

// Leaflet.pm toolbar
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
        try {
          map.removeLayer(e.layer);
        } catch {}
      }
      if (e.shape === "Marker") {
        const coord = e.layer.getLatLng();
        onMarkerCreated(coord);
        try {
          map.removeLayer(e.layer);
        } catch {}
      }
    };

    map.on("pm:create", handleCreate);
    return () => map.off("pm:create", handleCreate);
  }, [map, onLineCreated, onMarkerCreated]);

  return null;
};

// util: format panjang
const formatLength = (length) =>
  length >= 1000 ? (length / 1000).toFixed(2) + " km" : length.toFixed(2) + " m";

// util: hitung panjang polyline
const calculateLength = (coords) => {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += coords[i - 1].distanceTo(coords[i]);
  }
  return parseFloat(total.toFixed(2));
};

// escape XML untuk nama
function escapeXml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;")
    .replace(/\'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// generate KML
const generateKML = (projectName, lines, markers) => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2"><Document>`;
  const footer = `</Document></kml>`;

  const placemarksLines = lines
    .map((ln) => {
      const coords = ln.coords.map((p) => `${p.lng},${p.lat},0`).join(" ");
      return `<Placemark>
        <name>${escapeXml(projectName + " - " + ln.name)}</name>
        <ExtendedData>
          <Data name="price"><value>${ln.price}</value></Data>
          <Data name="total"><value>${ln.total}</value></Data>
        </ExtendedData>
        <LineString><coordinates>${coords}</coordinates></LineString>
      </Placemark>`;
    })
    .join("\n");

  const placemarksPoints = markers
    .map((m) => {
      return `<Placemark>
        <name>${escapeXml(projectName + " - " + m.name)}</name>
        <ExtendedData>
          <Data name="price"><value>${m.price}</value></Data>
          <Data name="total"><value>${m.total}</value></Data>
        </ExtendedData>
        <Point><coordinates>${m.coord.lng},${m.coord.lat},0</coordinates></Point>
      </Placemark>`;
    })
    .join("\n");

  return header + placemarksLines + placemarksPoints + footer;
};

// generate DXF sederhana
const generateDXF = (projectName, lines) => {
  let dxf = "0\nSECTION\n2\nENTITIES\n";
  lines.forEach((ln) => {
    dxf += "0\nPOLYLINE\n8\n0\n66\n1\n70\n0\n";
    ln.coords.forEach((p) => {
      dxf += "0\nVERTEX\n8\n0\n";
      dxf += "10\n" + p.lng + "\n20\n" + p.lat + "\n";
    });
    dxf += "0\nSEQEND\n8\n0\n";
  });
  dxf += "0\nENDSEC\n0\nEOF\n";
  return dxf;
};

const Project = () => {
  const [projectName, setProjectName] = useState("isi nama project nya dulu bang");
  const [lines, setLines] = useState([]);
  const [markers, setMarkers] = useState([]);
  const fileInputRef = useRef();

  // tambah polyline
  const handleLineCreated = (coords) => {
    const name = prompt("Masukkan nama kabel:");
    const priceInput = prompt("Masukkan harga per meter (Rp): (ketik 0 jika kosong)");
    const price = parseFloat(priceInput?.replace(/[, ]+/g, "")) || 0;
    const length = calculateLength(coords);
    const line = {
      id: Date.now(),
      name: name || "Kabel Tanpa Nama",
      coords,
      length,
      price,
      total: parseFloat((length * price).toFixed(2)),
    };
    setLines((prev) => [...prev, line]);
  };

  // tambah marker
  const handleMarkerCreated = (coord) => {
    const name = prompt("Masukkan nama titik jaringan:");
    const priceInput = prompt("Masukkan harga titik (Rp): (ketik 0 jika kosong)");
    const price = parseFloat(priceInput?.replace(/[, ]+/g, "")) || 0;
    const marker = {
      id: Date.now(),
      name: name || "Titik Tanpa Nama",
      coord,
      price,
      total: parseFloat(price.toFixed(2)),
    };
    setMarkers((prev) => [...prev, marker]);
  };

  // total biaya
  const totalBiaya =
    lines.reduce((s, l) => s + (Number(l.total) || 0), 0) +
    markers.reduce((s, m) => s + (Number(m.total) || 0), 0);

  // === Export KMZ/KML ===
  const exportKMZ = () => {
    const kml = generateKML(projectName, lines, markers);
    const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
    saveAs(blob, `${projectName}.kml`);
  };

  // === Export Excel multi-sheet ===
  const exportToExcel = async () => {
    const today = new Date().toLocaleDateString("id-ID");
    const wb = new ExcelJS.Workbook();

    // Sheet Info
    const wsInfo = wb.addWorksheet("Info Project");
    wsInfo.addRows([
      ["Nama Project", projectName],
      ["Tanggal Export", today],
      ["Total Biaya", totalBiaya],
    ]);
    wsInfo.columns = [{ width: 25 }, { width: 40 }];

    // Sheet Jalur Fiber
    const wsLine = wb.addWorksheet("Jalur Fiber");
    wsLine.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Jalur", key: "nama", width: 25 },
      { header: "Panjang (m)", key: "panjang_m", width: 15 },
      { header: "Panjang (km)", key: "panjang_km", width: 15 },
      { header: "Harga/m", key: "harga", width: 15 },
      { header: "Total", key: "total", width: 20 },
    ];
    lines.forEach((line, idx) =>
      wsLine.addRow({
        no: idx + 1,
        nama: line.name,
        panjang_m: line.length,
        panjang_km: line.length / 1000,
        harga: line.price,
        total: line.total,
      })
    );
    wsLine.addRow({ nama: "Subtotal", total: lines.reduce((s, l) => s + l.total, 0) });

    // Sheet Titik
    const wsMarker = wb.addWorksheet("Titik Jaringan");
    wsMarker.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Titik", key: "nama", width: 25 },
      { header: "Harga", key: "harga", width: 15 },
      { header: "Total", key: "total", width: 20 },
      { header: "Koordinat", key: "koor", width: 30 },
    ];
    markers.forEach((m, idx) =>
      wsMarker.addRow({
        no: idx + 1,
        nama: m.name,
        harga: m.price,
        total: m.total,
        koor: `${m.coord.lat}, ${m.coord.lng}`,
      })
    );
    wsMarker.addRow({ nama: "Subtotal", total: markers.reduce((s, m) => s + m.total, 0) });

    // Sheet Ringkasan
    const wsSummary = wb.addWorksheet("Ringkasan");
    wsSummary.columns = [
      { header: "Komponen", key: "komp", width: 25 },
      { header: "Biaya (Rp)", key: "biaya", width: 20 },
    ];
    wsSummary.addRow({ komp: "Jalur Fiber", biaya: lines.reduce((s, l) => s + l.total, 0) });
    wsSummary.addRow({ komp: "Titik Jaringan", biaya: markers.reduce((s, m) => s + m.total, 0) });
    wsSummary.addRow({ komp: "Total Keseluruhan", biaya: totalBiaya });

    // Styling
    [wsLine, wsMarker, wsSummary].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (["harga", "total", "biaya"].includes(sheet.columns[cell.col - 1]?.key)) {
            cell.numFmt = '"Rp"#,##0';
          }
        })
      );
    });

    [wsLine, wsMarker, wsSummary].forEach((sheet) => {
      if (sheet.lastRow) sheet.lastRow.font = { bold: true };
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `${projectName}.xlsx`);
  };

  // === Export DXF ===
  const exportDXF = () => {
    const dxf = generateDXF(projectName, lines);
    const blob = new Blob([dxf], { type: "application/dxf" });
    saveAs(blob, `${projectName}.dxf`);
  };

  // === Import KMZ/KML ===
  const handleKMZUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.toLowerCase().endsWith(".kmz")) {
        const zip = await JSZip.loadAsync(file);
        let kmlFile = null;
        zip.forEach((relativePath, f) => {
          if (relativePath.toLowerCase().endsWith(".kml")) kmlFile = f;
        });
        if (!kmlFile) {
          alert("KMZ tidak ada KML di dalamnya");
          return;
        }
        const kmlText = await kmlFile.async("text");
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, "text/xml");
        importGeojsonFeatures(toGeoJSON.kml(kml));
      } else {
        const text = await file.text();
        const parser = new DOMParser();
        const kml = parser.parseFromString(text, "text/xml");
        importGeojsonFeatures(toGeoJSON.kml(kml));
      }
    } catch (err) {
      console.error(err);
      alert("Gagal membaca file: " + err.message);
    } finally {
      e.target.value = null;
    }
  };

  // parse GeoJSON jadi state
  const importGeojsonFeatures = (geojson) => {
    if (!geojson?.features) return;
    const addedLines = [];
    const addedMarkers = [];

    geojson.features.forEach((f) => {
      const props = f.properties || {};
      const name = props.name || "Imported";
      if (f.geometry.type === "LineString") {
        const coords = f.geometry.coordinates.map((c) => L.latLng(c[1], c[0]));
        const length = calculateLength(coords);
        addedLines.push({
          id: Date.now() + Math.random(),
          name,
          coords,
          length,
          price: Number(props.price) || 0,
          total: parseFloat((length * (Number(props.price) || 0)).toFixed(2)),
        });
      } else if (f.geometry.type === "Point") {
        const c = f.geometry.coordinates;
        addedMarkers.push({
          id: Date.now() + Math.random(),
          name,
          coord: L.latLng(c[1], c[0]),
          price: Number(props.price) || 0,
          total: Number(props.price) || 0,
        });
      }
    });

    if (addedLines.length) setLines((prev) => [...prev, ...addedLines]);
    if (addedMarkers.length) setMarkers((prev) => [...prev, ...addedMarkers]);
  };

  const openKMZInput = () => fileInputRef.current?.click();
  const clearProject = () => {
    if (window.confirm("Hapus semua data project?")) {
      setLines([]);
      setMarkers([]);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-2">
        <Col>
          <Button variant="primary" onClick={exportKMZ} className="me-2">
            Download KML
          </Button>
          <Button variant="secondary" onClick={openKMZInput} className="me-2">
            Upload KMZ/KML
          </Button>
          <input
            type="file"
            accept=".kmz,.kml"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleKMZUpload}
          />
          <Button variant="info" onClick={exportDXF} className="me-2">
            Download DXF
          </Button>
          <Button variant="success" onClick={exportToExcel} className="me-2">
            Export Excel
          </Button>
          <Button variant="danger" onClick={clearProject}>
            Clear Project
          </Button>
        </Col>
      </Row>

      <Row>
        <Col md={8}>
          <MapContainer
            center={[-6.2, 106.8]}
            zoom={13}
            style={{ height: "80vh", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
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
                  Harga/m: Rp {line.price.toLocaleString()}
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
                  Harga: Rp {m.price.toLocaleString()}
                  <br />
                  Total: Rp {m.total.toLocaleString()}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Col>

        <Col md={4}>
          <h4> Nama Project</h4>
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
      <th>Nama Jalur</th>
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
      <th>Nama Titik</th>
      <th>Harga</th>
      <th>Total</th>
      <th>Koordinat</th>
    </tr>
  </thead>
  <tbody>
    {markers.map((marker, idx) => (
      <tr key={marker.id}>
        <td>{idx + 1}</td>
        <td>{marker.name}</td>
        <td>Rp {marker.price.toLocaleString()}</td>
        <td>Rp {marker.total.toLocaleString()}</td>
        <td>{marker.coord.lat.toFixed(6)}, {marker.coord.lng.toFixed(6)}</td>
      </tr>
    ))}
  </tbody>
</Table>

<h5 className="mt-3">
   Total Keseluruhan: <b>Rp {totalBiaya.toLocaleString()}</b>
</h5>

        </Col>
      </Row>
    </Container>
  );
};

export default Project;
