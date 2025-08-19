import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { Accordion, Badge, Button, Card, Col, Container, Form, InputGroup, Row, Table, Tabs, Tab, } from "react-bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "leaflet/dist/leaflet.css";


const mapCenter = [-6.2, 106.8];
const RADIUS = 0.1;
const statusColorFromCounts = (used, total) => {
  if (used === 0) return "green";
  if (used < total) return "orange";
  return "red";
};


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


function useCoreManagement() {
  const [cables, setCables] = useState([]);
  const [coreStatus, setCoreStatus] = useState([]);
  const [splicePairs, setSplicePairs] = useState([]);
  const [splitters, setSplitters] = useState([]);
  const [backupLinks, setBackupLinks] = useState([]);

  // load
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

  // save
  useEffect(() => {
    localStorage.setItem(
      "core_data",
      JSON.stringify({ cables, coreStatus, splicePairs, splitters, backupLinks })
    );
  }, [cables, coreStatus, splicePairs, splitters, backupLinks]);

  // actions
  const addCable = (name, coresNum) => {
    const nm = (name || "").trim();
    const cn = Math.max(1, parseInt(coresNum || 0, 10));
    if (!nm) return;

    const coresArr = Array.from({ length: cn }, (_, i) => ({
      coreId: `${nm}-C${i + 1}`,
      status: "Available",
    }));

    setCables((prev) => [...prev, { name: nm, cores: cn }]);
    setCoreStatus((prev) => [...prev, ...coresArr]);
  };

  const deleteCable = (name) => {
    setCables((prev) => prev.filter((c) => c.name !== name));
    setCoreStatus((prev) => prev.filter((c) => !c.coreId.startsWith(`${name}-`)));
    setBackupLinks((prev) => prev.filter((b) => b.from !== name && b.to !== name));
  };

  const toggleCore = (coreId) => {
    setCoreStatus((prev) =>
      prev.map((c) =>
        c.coreId === coreId ? { ...c, status: c.status === "Available" ? "Used" : "Available" } : c
      )
    );
  };

  const addSplice = (from, to) => {
    const f = (from || "").trim();
    const t = (to || "").trim();
    if (!f || !t) return;
    setSplicePairs((prev) => [...prev, { from: f, to: t }]);
  };

  const deleteSplice = (idx) => {
    setSplicePairs((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSplitter = (name, ports) => {
    const nm = (name || "").trim();
    const pn = Math.max(1, parseInt(ports || 0, 10));
    if (!nm) return;
    const prts = Array.from({ length: pn }, (_, i) => ({ splitterId: `${nm}-P${i + 1}`, status: "Empty" }));
    setSplitters((prev) => [...prev, { name: nm, ports: prts }]);
  };

  const deleteSplitter = (name) => {
    setSplitters((prev) => prev.filter((s) => s.name !== name));
  };

  const addBackupLink = (from, to) => {
    const f = (from || "").trim();
    const t = (to || "").trim();
    if (!f || !t || f === t) return;
    setBackupLinks((prev) => [...prev, { from: f, to: t }]);
  };

  const deleteBackupLink = (idx) => {
    setBackupLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  return {
    // state
    cables,
    coreStatus,
    splicePairs,
    splitters,
    backupLinks,
    // actions
    addCable,
    deleteCable,
    toggleCore,
    addSplice,
    deleteSplice,
    addSplitter,
    deleteSplitter,
    addBackupLink,
    deleteBackupLink,
  };
}


const CableForm = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [cores, setCores] = useState(12);
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Form.Group className="mb-2">
        <Form.Label>Nama Kabel / POP</Form.Label>
        <Form.Control value={name} placeholder="Misal: POP-01" onChange={(e) => setName(e.target.value)} />
      </Form.Group>
      <Form.Group className="mb-2">
        <Form.Label>Jumlah Core</Form.Label>
        <Form.Control type="number" min={1} value={cores} onChange={(e) => setCores(e.target.value)} />
      </Form.Group>
      <Button onClick={() => { onAdd(name, cores); setName(""); setCores(12); }}>Tambah</Button>
    </Form>
  );
};

const SpliceForm = ({ onAdd }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Form.Group className="mb-2">
        <Form.Label>Dari Core</Form.Label>
        <Form.Control value={from} placeholder="Misal: POP-01-C1" onChange={(e) => setFrom(e.target.value)} />
      </Form.Group>
      <Form.Group className="mb-2">
        <Form.Label>Ke Core</Form.Label>
        <Form.Control value={to} placeholder="Misal: POP-02-C1" onChange={(e) => setTo(e.target.value)} />
      </Form.Group>
      <Button onClick={() => { onAdd(from, to); setFrom(""); setTo(""); }}>Splice</Button>
    </Form>
  );
};

const SplitterForm = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [ports, setPorts] = useState(8);
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Form.Group className="mb-2">
        <Form.Label>Nama Splitter</Form.Label>
        <Form.Control value={name} placeholder="Misal: ODP-A-01" onChange={(e) => setName(e.target.value)} />
      </Form.Group>
      <Form.Group className="mb-2">
        <Form.Label>Jumlah Port</Form.Label>
        <Form.Control type="number" min={1} value={ports} onChange={(e) => setPorts(e.target.value)} />
      </Form.Group>
      <Button onClick={() => { onAdd(name, ports); setName(""); setPorts(8); }}>Tambah</Button>
    </Form>
  );
};

const BackupLinkForm = ({ onAdd, options }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Row>
        <Col md={6} className="mb-2">
          <Form.Label>Dari POP</Form.Label>
          <Form.Select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Pilih…</option>
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={6} className="mb-2">
          <Form.Label>Ke POP</Form.Label>
          <Form.Select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Pilih…</option>
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>
      <Button onClick={() => { onAdd(from, to); setFrom(""); setTo(""); }}>Tambah Backup Link</Button>
    </Form>
  );
};


const CoreTable = ({ data, onToggle }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((c) => {
      const matchText = c.coreId.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <Card>
      <Card.Body>
        <Row className="g-2 mb-2">
          <Col md={7}>
            <InputGroup>
              <InputGroup.Text>cari</InputGroup.Text>
              <Form.Control placeholder="Cari Core (misal: POP-01-C1)" value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
          </Col>
          <Col md={5}>
            <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">Semua Status</option>
              <option value="Available">Available</option>
              <option value="Used">Used</option>
            </Form.Select>
          </Col>
        </Row>
        <div className="table-responsive" style={{ maxHeight: 340, overflow: "auto" }}>
          <Table striped bordered hover size="sm" className="mb-0">
            <thead className="table-light" style={{ position: "sticky", top: 0 }}>
              <tr>
                <th>Core ID</th>
                <th>Status</th>
                <th style={{ width: 110 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((core) => (
                <tr key={core.coreId}>
                  <td>{core.coreId}</td>
                  <td>
                    {core.status === "Available" ? (
                      <Badge bg="success">Available</Badge>
                    ) : (
                      <Badge bg="danger">Used</Badge>
                    )}
                  </td>
                  <td>
                    <Button size="sm" variant={core.status === "Available" ? "outline-success" : "outline-danger"} onClick={() => onToggle(core.coreId)}>
                      Toggle
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted">Tidak ada data</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
};

const SpliceTable = ({ data, onDelete }) => (
  <Card>
    <Card.Body>
      <div className="table-responsive">
        <Table striped bordered hover size="sm" className="mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Dari</th>
              <th>Ke</th>
              <th style={{ width: 80 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((pair, idx) => (
              <tr key={`${pair.from}-${pair.to}-${idx}`}>
                <td>{idx + 1}</td>
                <td>{pair.from}</td>
                <td>{pair.to}</td>
                <td>
                  <Button size="sm" variant="outline-danger" onClick={() => onDelete(idx)}>Hapus</Button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted">Belum ada splice</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Card.Body>
  </Card>
);

const SplitterList = ({ data, onDelete }) => (
  <div className="d-flex flex-column gap-3">
    {data.map((splitter) => (
      <Card key={splitter.name} className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>spliter {splitter.name}</strong>
          <Button size="sm" variant="outline-danger" onClick={() => onDelete(splitter.name)}>Hapus</Button>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table size="sm" bordered className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Port</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {splitter.ports.map((p) => (
                  <tr key={p.splitterId}>
                    <td>{p.splitterId}</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    ))}
    {data.length === 0 && <div className="text-muted text-center">Belum ada splitter/ODP</div>}
  </div>
);


const MapView = ({ cables, coreStatus, backupLinks }) => {

  const ringNodes = useMemo(() => {
    if (cables.length === 0) return [];
    return cables.map((cable, idx) => {
      const angle = (idx / cables.length) * 2 * Math.PI;
      const lat = mapCenter[0] + RADIUS * Math.sin(angle);
      const lng = mapCenter[1] + RADIUS * Math.cos(angle);
      const popCores = coreStatus.filter((c) => c.coreId.startsWith(`${cable.name}-`));
      const used = popCores.filter((c) => c.status === "Used").length;
      return {
        name: cable.name,
        cores: cable.cores,
        position: [lat, lng],
        statusColor: statusColorFromCounts(used, popCores.length || 1),
        used,
        total: popCores.length,
      };
    });
  }, [cables, coreStatus]);

  const backboneLinks = useMemo(() => {
    if (ringNodes.length === 0) return [];
    return ringNodes.map((node, idx) => ({
      key: `${node.name}__${ringNodes[(idx + 1) % ringNodes.length].name}`,
      from: node.name,
      to: ringNodes[(idx + 1) % ringNodes.length].name,
      positions: [node.position, ringNodes[(idx + 1) % ringNodes.length].position],
    }));
  }, [ringNodes]);

  const backupPolylines = useMemo(() => {
    if (ringNodes.length === 0 || backupLinks.length === 0) return [];
    const indexByName = new Map(ringNodes.map((n) => [n.name, n]));
    const lines = [];
    for (const b of backupLinks) {
      const a = indexByName.get(b.from);
      const c = indexByName.get(b.to);
      if (a && c) lines.push({ key: `backup_${b.from}__${b.to}`, positions: [a.position, c.position], from: b.from, to: b.to });
    }
    return lines;
  }, [ringNodes, backupLinks]);

  const [hoverIdx, setHoverIdx] = useState(null);

  return (
    <MapContainer center={mapCenter} zoom={12} style={{ height: 520, width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {ringNodes.length > 0 && <FitBounds nodes={ringNodes} />}

      {/* backup links */}
      {backupPolylines.map((l) => (
        <Polyline
          key={l.key}
          positions={l.positions}
          pathOptions={{ color: "purple", weight: 3, dashArray: "6 6" }}
          eventHandlers={{
            click: (e) => {
              L.popup().setLatLng(e.latlng).setContent(`<b>Backup Link</b><br/>${l.from} ➜ ${l.to}`).openOn(e.target._map);
            },
          }}
        />
      ))}

      {/* backbone ring */}
      {backboneLinks.map((link, idx) => (
        <Polyline
          key={link.key}
          positions={link.positions}
          pathOptions={{ color: hoverIdx === idx ? "yellow" : "blue", weight: hoverIdx === idx ? 6 : 4 }}
          eventHandlers={{
            mouseover: () => setHoverIdx(idx),
            mouseout: () => setHoverIdx(null),
            click: (e) => {
              L.popup().setLatLng(e.latlng).setContent(`<b>Backbone</b><br/>${link.from} ➜ ${link.to}`).openOn(e.target._map);
            },
          }}
        />
      ))}

      {/* nodes */}
      {ringNodes.map((n, idx) => (
        <Marker
          key={idx}
          position={n.position}
          icon={L.divIcon({
            className: "",
            html: `<div style="background:${n.statusColor};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
          })}
        >
          <Popup>
            <div>
              <strong>{n.name}</strong>
              <br />{n.cores} core
              <br />Used: {n.used}/{n.total}
              <br />Status: {n.statusColor === "green" ? "Semua tersedia" : n.statusColor === "orange" ? "Sebagian terpakai" : "Semua terpakai"}
            </div>
          </Popup>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {n.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
};


const exportToExcel = (coreStatus) => {
  const ws = XLSX.utils.json_to_sheet(coreStatus);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CoreStatus");
  XLSX.writeFile(wb, "core-status.xlsx");
};

const exportToPDF = (coreStatus) => {
  const doc = new jsPDF();
  doc.text("Laporan Core Status", 10, 10);
  let y = 20;
  coreStatus.forEach((core) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${core.coreId}: ${core.status}`, 10, y);
    y += 6;
  });
  doc.save("core-status.pdf");
};


export function Core() {
  const { cables, coreStatus, splicePairs, splitters, backupLinks, addCable, deleteCable, toggleCore,
    addSplice, deleteSplice, addSplitter, deleteSplitter, addBackupLink, deleteBackupLink, } = useCoreManagement();

  return (
    <Container fluid className="py-3">
      <Row className="mb-3 align-items-center">
        <Col>
          <h3 className="mb-0">Aplikasi Web Manajemen Core FTTH ISP</h3>
          <div className="text-muted">Refactor: lebih rapi, terstruktur, dan friendly untuk maintenance</div>
        </Col>
        <Col className="text-end">
          <Button variant="warning" className="me-2" onClick={() => exportToExcel(coreStatus)}>⬇ Excel</Button>
          <Button variant="info" onClick={() => exportToPDF(coreStatus)}>⬇ PDF</Button>
        </Col>
      </Row>

      <Row className="g-3">
        {/* Left column: Forms & Lists */}
        <Col md={4}>
          <Accordion defaultActiveKey={["kabel", "core"]} alwaysOpen>
            <Accordion.Item eventKey="kabel">
              <Accordion.Header> Tambah Kabel / POP</Accordion.Header>
              <Accordion.Body>
                <CableForm onAdd={addCable} />
                {cables.length > 0 && (
                  <div className="mt-3">
                    <div className="fw-semibold mb-2">Daftar POP/Kabel</div>
                    <div className="table-responsive" style={{ maxHeight: 200, overflow: "auto" }}>
                      <Table size="sm" bordered hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nama</th>
                            <th className="text-center" style={{ width: 90 }}>Core</th>
                            <th style={{ width: 80 }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cables.map((c) => (
                            <tr key={c.name}>
                              <td>{c.name}</td>
                              <td className="text-center"><Badge bg="secondary">{c.cores}</Badge></td>
                              <td>
                                <Button size="sm" variant="outline-danger" onClick={() => deleteCable(c.name)}>Hapus</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="splice">
              <Accordion.Header> Splicing Core</Accordion.Header>
              <Accordion.Body>
                <SpliceForm onAdd={addSplice} />
                <div className="mt-3">
                  <SpliceTable data={splicePairs} onDelete={deleteSplice} />
                </div>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="splitter">
              <Accordion.Header> Splitter / ODP</Accordion.Header>
              <Accordion.Body>
                <SplitterForm onAdd={addSplitter} />
                <div className="mt-3">
                  <SplitterList data={splitters} onDelete={deleteSplitter} />
                </div>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="backup">
              <Accordion.Header>🛟 Backup Link</Accordion.Header>
              <Accordion.Body>
                <BackupLinkForm onAdd={addBackupLink} options={cables.map((c) => c.name)} />
                {backupLinks.length > 0 && (
                  <div className="table-responsive mt-3" style={{ maxHeight: 220, overflow: "auto" }}>
                    <Table striped bordered size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 60 }}>#</th>
                          <th>Dari</th>
                          <th>Ke</th>
                          <th style={{ width: 80 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupLinks.map((b, i) => (
                          <tr key={`${b.from}-${b.to}-${i}`}>
                            <td>{i + 1}</td>
                            <td>{b.from}</td>
                            <td>{b.to}</td>
                            <td>
                              <Button size="sm" variant="outline-danger" onClick={() => deleteBackupLink(i)}>Hapus</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="core">
              <Accordion.Header> Status Core</Accordion.Header>
              <Accordion.Body>
                <CoreTable data={coreStatus} onToggle={toggleCore} />
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Col>

        {/* Right column: Map + tabs */}
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <strong>Peta Kabel</strong> <span className="text-muted">(Ring Topology + Backup)</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="success">Available</Badge>
                  <Badge bg="warning" text="dark">Sebagian</Badge>
                  <Badge bg="danger">Penuh</Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ padding: 0 }}>
              <MapView cables={cables} coreStatus={coreStatus} backupLinks={backupLinks} />
            </Card.Body>
          </Card>

          <Tabs defaultActiveKey="splice" className="mt-3">
            <Tab eventKey="splice" title="Sambungan Splice">
              <div className="mt-3">
                <SpliceTable data={splicePairs} onDelete={deleteSplice} />
              </div>
            </Tab>
            <Tab eventKey="splitter" title="Data Splitter/ODP">
              <div className="mt-3">
                <SplitterList data={splitters} onDelete={deleteSplitter} />
              </div>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
}


export default Core;
