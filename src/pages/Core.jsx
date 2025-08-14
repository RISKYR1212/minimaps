import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Button, Table, Form, Container, Row, Col } from "react-bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "leaflet/dist/leaflet.css";

const FitBounds = ({ nodes }) => {
  const map = useMap();
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      const bounds = L.latLngBounds(nodes.map((n) => n.position));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nodes, map]);
  return null;
};

const CoreManagementApp = () => {
  // === DATA STATE UTAMA ===
  const [cables, setCables] = useState([]);
  const [newCable, setNewCable] = useState({ name: "", cores: 12 });
  const [coreStatus, setCoreStatus] = useState([]);
  const [splicePairs, setSplicePairs] = useState([]);
  const [newSplice, setNewSplice] = useState({ from: "", to: "" });
  const [splitters, setSplitters] = useState([]);
  const [newSplitter, setNewSplitter] = useState({ name: "", ports: 8 });

  // === BACKUP LINK (opsional) ===
  // Simpan link cadangan antar POP (by name). Akan digambar putus-putus.
  const [backupLinks, setBackupLinks] = useState([]);
  const [newBackup, setNewBackup] = useState({ from: "", to: "" });

  // === UI STATE ===
  const [hoverLinkIdx, setHoverLinkIdx] = useState(null);

  // === PERSISTENSI LOCAL STORAGE ===
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("core_data"));
    if (saved) {
      setCables(saved.cables || []);
      setCoreStatus(saved.coreStatus || []);
      setSplicePairs(saved.splicePairs || []);
      setSplitters(saved.splitters || []);
      setBackupLinks(saved.backupLinks || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "core_data",
      JSON.stringify({ cables, coreStatus, splicePairs, splitters, backupLinks })
    );
  }, [cables, coreStatus, splicePairs, splitters, backupLinks]);

  // === ACTIONS ===
  const addCable = () => {
    const name = (newCable.name || "").trim();
    const coresNum = Math.max(1, parseInt(newCable.cores || 0, 10));
    if (!name) return;

    // Buat daftar core default untuk kabel ini
    const cores = Array.from({ length: coresNum }, (_, i) => ({
      coreId: `${name}-C${i + 1}`,
      status: "Available",
    }));

    setCables((prev) => [...prev, { name, cores: coresNum }]);
    setCoreStatus((prev) => [...prev, ...cores]);
    setNewCable({ name: "", cores: 12 });
  };

  const toggleCore = (coreId) => {
    setCoreStatus((prev) =>
      prev.map((c) =>
        c.coreId === coreId
          ? { ...c, status: c.status === "Available" ? "Used" : "Available" }
          : c
      )
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
      const y = 20 + index * 6;
      // Cegah tulisan keluar halaman
      if (y > 280) {
        doc.addPage();
      }
      doc.text(`${core.coreId}: ${core.status}`, 10, y > 280 ? 20 : y);
    });
    doc.save("core-status.pdf");
  };

  const addSplice = () => {
    if (newSplice.from && newSplice.to) {
      setSplicePairs((prev) => [...prev, { from: newSplice.from, to: newSplice.to }]);
      setNewSplice({ from: "", to: "" });
    }
  };

  const addSplitter = () => {
    const nm = (newSplitter.name || "").trim();
    const portsNum = Math.max(1, parseInt(newSplitter.ports || 0, 10));
    if (!nm) return;

    const ports = Array.from({ length: portsNum }, (_, i) => ({
      splitterId: `${nm}-P${i + 1}`,
      status: "Empty",
    }));
    setSplitters((prev) => [...prev, { name: nm, ports }]);
    setNewSplitter({ name: "", ports: 8 });
  };

  const addBackupLink = () => {
    const from = (newBackup.from || "").trim();
    const to = (newBackup.to || "").trim();
    if (!from || !to || from === to) return;
    setBackupLinks((prev) => [...prev, { from, to }]);
    setNewBackup({ from: "", to: "" });
  };

  // === PERHITUNGAN TOPOLOGI RING (LOGICAL) ===
  // Bisa diganti ke koordinat nyata jika kamu punya lat/lng untuk masing2 POP.
  const mapCenter = [-6.2, 106.8];
  const radius = 0.1;

  // Node ring dihitung dari kabel yang ada.
  const ringNodes = useMemo(() => {
    if (cables.length === 0) return [];
    return cables.map((cable, idx) => {
      const angle = (idx / cables.length) * 2 * Math.PI;
      const lat = mapCenter[0] + radius * Math.sin(angle);
      const lng = mapCenter[1] + radius * Math.cos(angle);

      // Hitung status POP dari coreStatus milik kabel ini
      const popCores = coreStatus.filter((c) => c.coreId.startsWith(`${cable.name}-`));
      const usedCount = popCores.filter((c) => c.status === "Used").length;
      let statusColor = "green";
      if (usedCount > 0 && usedCount < popCores.length) statusColor = "orange";
      if (usedCount > 0 && usedCount === popCores.length) statusColor = "red";

      return {
        name: cable.name,
        cores: cable.cores,
        position: [lat, lng],
        statusColor,
      };
    });
  }, [cables, coreStatus]);

  // Link ring utama (menghubungkan node ke node berikutnya)
  const backboneLinks = useMemo(() => {
    if (ringNodes.length === 0) return [];
    return ringNodes.map((node, idx) => {
      const nextNode = ringNodes[(idx + 1) % ringNodes.length];
      return {
        key: `${node.name}__${nextNode.name}`,
        from: node.name,
        to: nextNode.name,
        positions: [node.position, nextNode.position],
      };
    });
  }, [ringNodes]);

  // Backup links (opsional) – digambar putus-putus berdasarkan nama POP
  const backupPolylines = useMemo(() => {
    if (ringNodes.length === 0 || backupLinks.length === 0) return [];
    const indexByName = new Map(ringNodes.map((n, i) => [n.name, i]));
    const lines = [];
    for (const b of backupLinks) {
      const iA = indexByName.get(b.from);
      const iB = indexByName.get(b.to);
      if (iA != null && iB != null) {
        lines.push({
          key: `backup_${b.from}__${b.to}`,
          from: b.from,
          to: b.to,
          positions: [ringNodes[iA].position, ringNodes[iB].position],
        });
      }
    }
    return lines;
  }, [ringNodes, backupLinks]);

  // === RENDER ===
  return (
    <Container fluid>
      <h3 className="mt-3">Aplikasi Web Manajemen Core FTTH ISP</h3>
      <Row className="mt-4">
        <Col md={4}>
          {/* Tambah Kabel */}
          <h5>➕ Tambah Kabel</h5>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group className="mb-2">
              <Form.Label>Nama Kabel / POP</Form.Label>
              <Form.Control
                value={newCable.name}
                onChange={(e) => setNewCable({ ...newCable, name: e.target.value })}
                placeholder="Misal: POP-01"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Jumlah Core</Form.Label>
              <Form.Control
                type="number"
                value={newCable.cores}
                onChange={(e) =>
                  setNewCable({ ...newCable, cores: e.target.value })
                }
                min={1}
              />
            </Form.Group>
            <Button className="mt-1" onClick={addCable}>
              Tambah
            </Button>
          </Form>

          {/* Splicing */}
          <h5 className="mt-4">🔗 Splicing Core</h5>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group className="mb-2">
              <Form.Label>Dari Core</Form.Label>
              <Form.Control
                value={newSplice.from}
                onChange={(e) =>
                  setNewSplice({ ...newSplice, from: e.target.value })
                }
                placeholder="Misal: POP-01-C1"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Ke Core</Form.Label>
              <Form.Control
                value={newSplice.to}
                onChange={(e) =>
                  setNewSplice({ ...newSplice, to: e.target.value })
                }
                placeholder="Misal: POP-02-C1"
              />
            </Form.Group>
            <Button className="mt-1" onClick={addSplice}>
              Splice
            </Button>
          </Form>

          {/* Splitter */}
          <h5 className="mt-4">📦 Splitter/ODP</h5>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group className="mb-2">
              <Form.Label>Nama Splitter</Form.Label>
              <Form.Control
                value={newSplitter.name}
                onChange={(e) =>
                  setNewSplitter({ ...newSplitter, name: e.target.value })
                }
                placeholder="Misal: ODP-A-01"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Jumlah Port</Form.Label>
              <Form.Control
                type="number"
                value={newSplitter.ports}
                onChange={(e) =>
                  setNewSplitter({ ...newSplitter, ports: e.target.value })
                }
                min={1}
              />
            </Form.Group>
            <Button className="mt-1" onClick={addSplitter}>
              Tambah
            </Button>
          </Form>

          {/* Backup Link */}
          <h5 className="mt-4">🛟 Backup Link (opsional)</h5>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group className="mb-2">
              <Form.Label>Dari POP</Form.Label>
              <Form.Control
                value={newBackup.from}
                onChange={(e) => setNewBackup({ ...newBackup, from: e.target.value })}
                placeholder="Misal: POP-01"
                list="popList"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Ke POP</Form.Label>
              <Form.Control
                value={newBackup.to}
                onChange={(e) => setNewBackup({ ...newBackup, to: e.target.value })}
                placeholder="Misal: POP-15"
                list="popList"
              />
            </Form.Group>
            <datalist id="popList">
              {cables.map((c, i) => (
                <option key={i} value={c.name} />
              ))}
            </datalist>
            <Button className="mt-1" onClick={addBackupLink}>
              Tambah Backup Link
            </Button>
            {backupLinks.length > 0 && (
              <Table striped bordered size="sm" className="mt-2">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dari</th>
                    <th>Ke</th>
                  </tr>
                </thead>
                <tbody>
                  {backupLinks.map((b, i) => (
                    <tr key={`${b.from}-${b.to}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{b.from}</td>
                      <td>{b.to}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Form>

          {/* Status Core */}
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
                    <Button
                      size="sm"
                      variant={core.status === "Available" ? "success" : "danger"}
                      onClick={() => toggleCore(core.coreId)}
                    >
                      Toggle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button variant="warning" onClick={exportToExcel}>
            ⬇ Export ke Excel
          </Button>{" "}
          <Button variant="info" onClick={exportToPDF}>
            Export ke PDF
          </Button>
        </Col>

        <Col md={8}>
          <h5>Peta Kabel (Ring Topology + Backup)</h5>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: "500px", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Fit otomatis ke semua node */}
            {ringNodes.length > 0 && <FitBounds nodes={ringNodes} />}

            {/* Garis Backup (putus-putus) */}
            {backupPolylines.map((link) => (
              <Polyline
                key={link.key}
                positions={link.positions}
                pathOptions={{
                  color: "purple",
                  weight: 3,
                  dashArray: "6 6",
                }}
                eventHandlers={{
                  click: (e) => {
                    L.popup()
                      .setLatLng(e.latlng)
                      .setContent(
                        `<b>Backup Link</b><br/>${link.from} ➜ ${link.to}`
                      )
                      .openOn(e.target._map);
                  },
                }}
              />
            ))}

            {/* Garis Backbone (solid) */}
            {backboneLinks.map((link, idx) => (
              <Polyline
                key={link.key}
                positions={link.positions}
                pathOptions={{
                  color: hoverLinkIdx === idx ? "yellow" : "blue",
                  weight: hoverLinkIdx === idx ? 6 : 4,
                }}
                eventHandlers={{
                  mouseover: () => setHoverLinkIdx(idx),
                  mouseout: () => setHoverLinkIdx(null),
                  click: (e) => {
                    L.popup()
                      .setLatLng(e.latlng)
                      .setContent(
                        `<b>Backbone</b><br/>${link.from} ➜ ${link.to}`
                      )
                      .openOn(e.target._map);
                  },
                }}
              />
            ))}

            {/* Marker POP (status warna) */}
            {ringNodes.map((node, idx) => (
              <Marker
                key={idx}
                position={node.position}
                icon={L.divIcon({
                  className: "",
                  html: `<div style="background:${node.statusColor};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
                })}
              >
                <Popup>
                  <div>
                    <strong>{node.name}</strong>
                    <br />
                    {node.cores} core
                    <br />
                    Status:{" "}
                    {node.statusColor === "green"
                      ? "Semua tersedia"
                      : node.statusColor === "orange"
                      ? "Sebagian terpakai"
                      : "Semua terpakai"}
                  </div>
                </Popup>
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  {node.name}
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>

          {/* Tabel splice */}
          <h5 className="mt-4">Sambungan Splice</h5>
          <Table striped bordered size="sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Dari</th>
                <th>Ke</th>
              </tr>
            </thead>
            <tbody>
              {splicePairs.map((pair, idx) => (
                <tr key={`${pair.from}-${pair.to}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{pair.from}</td>
                  <td>{pair.to}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Tabel Splitter/ODP */}
          <h5 className="mt-4">📡 Data Splitter/ODP</h5>
          {splitters.map((splitter, idx) => (
            <div key={idx} className="mb-3">
              <strong>{splitter.name}</strong>
              <Table size="sm" bordered className="mt-1">
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
