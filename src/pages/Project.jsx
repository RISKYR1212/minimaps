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
import Drawing from "dxf-writer";
import tokml from "tokml";

// ===== Master Data Aset =====
const assetTypes = [
  { key: "cable", label: "Kabel (Jalur Fiber)", unit: "m" },
  { key: "pole", label: "Tiang", unit: "buah" },
  { key: "odp", label: "ODP", unit: "buah" },
  { key: "odc", label: "ODC", unit: "buah" },
  { key: "jc", label: "Joint Closure", unit: "buah" },
  { key: "slack", label: "Slack", unit: "m" },
];

// custom marker icon
const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [25, 25],
});

// toolbar leaflet.pm
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
      removalMode: true,
    });

    const handleCreate = (e) => {
      if (e.shape === "Line" || e.shape === "Polyline") {
        const coords = e.layer.getLatLngs();
        onLineCreated(coords);
        map.removeLayer(e.layer);
      }
      if (e.shape === "Marker") {
        const coord = e.layer.getLatLng();
        onMarkerCreated(coord);
        map.removeLayer(e.layer);
      }
    };

    map.on("pm:create", handleCreate);
    return () => map.off("pm:create", handleCreate);
  }, [map, onLineCreated, onMarkerCreated]);

  return null;
};

// hitung panjang polyline
const calculateLength = (coords) => {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += coords[i - 1].distanceTo(coords[i]);
  }
  return total;
};

// format panjang
const formatLength = (length) => {
  if (!length) return "-";
  if (length < 1000) {
    return `${length.toFixed(0)} M`;
  } else {
    return `${(length / 1000).toFixed(2)} KM`;
  }
};

const Project = () => {
  const [projectName, setProjectName] = useState("isi nama project nya dulu bang");
  const [assets, setAssets] = useState([]);

  // refs untuk import file
  const kmzInputRef = useRef(null);
  const dxfInputRef = useRef(null);

  // tambah kabel
  const handleLineCreated = (coords) => {
    const name = prompt("Masukkan nama kabel:");
    const priceInput = prompt("Masukkan harga per meter (Rp): (ketik 0 jika kosong)");
    const price = parseFloat(priceInput?.replace(/[, ]+/g, "")) || 0;
    const length = calculateLength(coords);

    const asset = {
      id: Date.now(),
      type: "cable",
      name: name || "Kabel Tanpa Nama",
      coords,
      length,
      price,
      total: parseFloat((length * price).toFixed(2)),
    };
    setAssets((prev) => [...prev, asset]);
  };

  // tambah marker aset
  const handleMarkerCreated = (coord) => {
    const type = prompt("Jenis aset? (pole/odp/odc/jc/slack)") || "pole";
    const name = prompt("Masukkan nama aset:");
    const priceInput = prompt("Masukkan harga aset (Rp): (ketik 0 jika kosong)");
    const price = parseFloat(priceInput?.replace(/[, ]+/g, "")) || 0;

    const asset = {
      id: Date.now(),
      type,
      name: name || "Aset Tanpa Nama",
      coord,
      price,
      total: price,
    };
    setAssets((prev) => [...prev, asset]);
  };

  const totalBiaya = assets.reduce((s, a) => s + (Number(a.total) || 0), 0);

  // === Export Excel ===
  const exportToExcel = async () => {
    const today = new Date().toLocaleDateString("id-ID");
    const wb = new ExcelJS.Workbook();

    const wsInfo = wb.addWorksheet("Info Project");
    wsInfo.addRows([
      ["Nama Project", projectName],
      ["Tanggal Export", today],
      ["Total Biaya", totalBiaya],
    ]);

    // sheet per kategori
    assetTypes.forEach((t) => {
      const ws = wb.addWorksheet(t.label);
      ws.columns = [
        { header: "No", key: "no", width: 5 },
        { header: "Nama", key: "nama", width: 25 },
        { header: "Panjang/Unit", key: "len", width: 20 },
        { header: "Harga", key: "harga", width: 15 },
        { header: "Total", key: "total", width: 20 },
      ];
      const rows = assets.filter((a) => a.type === t.key);
      rows.forEach((a, i) =>
        ws.addRow({
          no: i + 1,
          nama: a.name,
          len: formatLength(a.length || 1),
          harga: a.price,
          total: a.total,
        })
      );
      ws.addRow({
        nama: "Subtotal",
        total: rows.reduce((s, a) => s + a.total, 0),
      });
    });

    const wsSummary = wb.addWorksheet("Ringkasan");
    wsSummary.addRow(["Komponen", "Biaya"]);
    assetTypes.forEach((t) => {
      const rows = assets.filter((a) => a.type === t.key);
      if (rows.length) {
        wsSummary.addRow([t.label, rows.reduce((s, a) => s + a.total, 0)]);
      }
    });
    wsSummary.addRow(["Total Keseluruhan", totalBiaya]);

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `${projectName}.xlsx`);
  };

  // === EXPORT KMZ ===
  const exportToKMZ = async () => {
    const geojson = {
      type: "FeatureCollection",
      features: assets.map((a) => {
        if (a.type === "cable") {
          return {
            type: "Feature",
            properties: { name: a.name, type: a.type },
            geometry: {
              type: "LineString",
              coordinates: a.coords.map((c) => [c.lng, c.lat]),
            },
          };
        } else {
          return {
            type: "Feature",
            properties: { name: a.name, type: a.type },
            geometry: {
              type: "Point",
              coordinates: [a.coord.lng, a.coord.lat],
            },
          };
        }
      }),
    };

    const kml = tokml(geojson);
    const zip = new JSZip();
    zip.file("doc.kml", kml);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${projectName}.kmz`);
  };

  // === IMPORT KMZ/KML ===
  const importKMZ = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const kmlFile = content.file(/.kml$/i)[0];
    if (!kmlFile) {
      alert("KML tidak ditemukan dalam KMZ");
      return;
    }

    const kmlText = await kmlFile.async("text");
    const parser = new DOMParser();
    const kmlDom = parser.parseFromString(kmlText, "text/xml");
    const geojson = toGeoJSON.kml(kmlDom);

    const importedAssets = geojson.features
      .map((f) => {
        if (f.geometry.type === "LineString") {
          const coords = f.geometry.coordinates.map(([lng, lat]) =>
            L.latLng(lat, lng)
          );
          const length = calculateLength(coords);
          return {
            id: Date.now() + Math.random(),
            type: "cable",
            name: f.properties.name || "Imported Cable",
            coords,
            length,
            price: 0,
            total: 0,
          };
        } else if (f.geometry.type === "Point") {
          const [lng, lat] = f.geometry.coordinates;
          return {
            id: Date.now() + Math.random(),
            type: f.properties.type || "pole",
            name: f.properties.name || "Imported Point",
            coord: L.latLng(lat, lng),
            price: 0,
            total: 0,
          };
        }
        return null;
      })
      .filter(Boolean);

    setAssets((prev) => [...prev, ...importedAssets]);
  };

  // === EXPORT DXF ===
  const exportToDXF = () => {
  const dxf = new DXFWriter();

  dxf.addLayer("Project", DXFWriter.ACI.BLUE, "CONTINUOUS");
  dxf.setActiveLayer("Project");

  assets.forEach((a) => {
    if (a.type === "cable") {
      for (let i = 1; i < a.coords.length; i++) {
        const p1 = a.coords[i - 1];
        const p2 = a.coords[i];
        dxf.drawLine(p1.lng, p1.lat, 0, p2.lng, p2.lat, 0);
      }
    } else {
      dxf.drawPoint(a.coord.lng, a.coord.lat, 0);
    }
  });

  const blob = new Blob([dxf.stringify()], { type: "application/dxf" });
  saveAs(blob, `${projectName}.dxf`);
};


  // === IMPORT DXF (basic) ===
  const importDXF = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/);

  let i = 0;
  const importedAssets = [];

  while (i < lines.length) {
    if (lines[i].trim() === "POINT") {
      const x = parseFloat(lines[i + 2]);
      const y = parseFloat(lines[i + 4]);
      importedAssets.push({
        id: Date.now() + Math.random(),
        type: "pole",
        name: "Imported Point",
        coord: L.latLng(y, x),
        price: 0,
        total: 0,
      });
    } else if (lines[i].trim() === "LINE") {
      const x1 = parseFloat(lines[i + 2]);
      const y1 = parseFloat(lines[i + 4]);
      const x2 = parseFloat(lines[i + 6]);
      const y2 = parseFloat(lines[i + 8]);
      const coords = [L.latLng(y1, x1), L.latLng(y2, x2)];
      importedAssets.push({
        id: Date.now() + Math.random(),
        type: "cable",
        name: "Imported Cable",
        coords,
        length: calculateLength(coords),
        price: 0,
        total: 0,
      });
    }
    i++;
  }

  setAssets((prev) => [...prev, ...importedAssets]);
};


  const clearProject = () => {
    if (window.confirm("Hapus semua data project?")) {
      setAssets([]);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-2">
        <Col>
          <Button variant="success" onClick={exportToExcel} className="me-2">
            Export Excel
          </Button>
          <Button variant="danger" onClick={clearProject} className="me-2">
            Clear Project
          </Button>

          {/* KMZ */}
          <Button variant="primary" onClick={exportToKMZ} className="me-2">
            Export KMZ
          </Button>
          <Button
            variant="secondary"
            className="me-2"
            onClick={() => kmzInputRef.current.click()}
          >
            Import KMZ
          </Button>
          <input
            type="file"
            accept=".kmz,.kml"
            ref={kmzInputRef}
            style={{ display: "none" }}
            onChange={importKMZ}
          />

          {/* DXF */}
          <Button variant="primary" onClick={exportToDXF} className="me-2">
            Export DXF
          </Button>
          <Button
            variant="secondary"
            onClick={() => dxfInputRef.current.click()}
          >
            Import DXF
          </Button>
          <input
            type="file"
            accept=".dxf"
            ref={dxfInputRef}
            style={{ display: "none" }}
            onChange={importDXF}
          />
        </Col>
      </Row>

      {/* MAP + BOQ */}
      <Row>
        <Col md={9}>
          <MapContainer
            center={[-6.2, 106.8]}
            zoom={19}
            style={{ height: "85vh", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              attribution="© Google"
              maxZoom={22}
            />


            <PmToolbar
              onLineCreated={handleLineCreated}
              onMarkerCreated={handleMarkerCreated}
            />

            {/* kabel */}
            {assets
              .filter((a) => a.type === "cable")
              .map((a) => (
                <Polyline key={a.id} positions={a.coords} color="blue">
                  <Popup>
                    <b>{a.name}</b>
                    <br />
                    Panjang: {formatLength(a.length)}
                    <br />
                    Harga/m: Rp {a.price.toLocaleString()}
                    <br />
                    Total: Rp {a.total.toLocaleString()}
                  </Popup>
                </Polyline>
              ))}

            {/* titik aset */}
            {assets
              .filter((a) => a.type !== "cable")
              .map((a) => (
                <Marker key={a.id} position={a.coord} icon={markerIcon}>
                  <Popup>
                    <b>{a.name}</b>
                    <br />
                    Harga: Rp {a.price.toLocaleString()}
                    <br />
                    Total: Rp {a.total.toLocaleString()}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </Col>

        {/* BOQ */}
        <Col md={3}>
          <h4>Nama Project</h4>
          <Form.Control
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mb-3"
          />

          <h4>Bill of Quantity (BOQ)</h4>
          {assetTypes.map((t) => {
            const rows = assets.filter((a) => a.type === t.key);
            if (!rows.length) return null;
            return (
              <div key={t.key} className="mb-3">
                <h5>{t.label}</h5>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama</th>
                      {t.key === "cable" || t.key === "slack" ? <th>Panjang</th> : <th>Unit</th>}
                      <th>Harga</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a, i) => (
                      <tr key={a.id}>
                        <td>{i + 1}</td>
                        <td>{a.name}</td>
                        <td>{a.length ? formatLength(a.length) : "1"}</td>
                        <td>Rp {a.price.toLocaleString()}</td>
                        <td>Rp {a.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={t.key === "cable" || t.key === "slack" ? 4 : 3}>
                        <b>Subtotal</b>
                      </td>
                      <td>
                        <b>
                          Rp {rows.reduce((s, a) => s + a.total, 0).toLocaleString()}
                        </b>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            );
          })}

          <h5 className="mt-3">
            Total Keseluruhan: <b>Rp {totalBiaya.toLocaleString()}</b>
          </h5>
        </Col>
      </Row>
    </Container>
  );
};

export default Project;
