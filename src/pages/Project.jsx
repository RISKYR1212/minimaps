// src/components/Project.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  LayersControl,
  LayerGroup,
} from "react-leaflet";
import L from "leaflet";
import {
  Container,
  Row,
  Col,
  Button,
  ListGroup,
  InputGroup,
  Form,
  Badge,
  ToggleButton,
  ButtonGroup,
  Modal,
} from "react-bootstrap";
import { saveAs } from "file-saver";
import tokml from "tokml";

// leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LayerToggle = ({ value, onChange, label }) => (
  <Form.Check
    type="switch"
    id={`switch-${label}`}
    label={label}
    checked={value}
    onChange={(e) => onChange(e.target.checked)}
  />
);

/**
 * NOTES:
 * - This component is a big starter (client-only). For production you must:
 *   - replace local arrays with API calls,
 *   - persist BOQ / assets / approvals,
 *   - implement auth & RBAC.
 */

const Project = ({ currentUser = { id: 1, role: "manager" } }) => {
  // states
  const [projects, setProjects] = useState([]); // pins
  const [cables, setCables] = useState([]); // {id, fromId, toId, status: 'plan'|'build', meta}
  const [showPlanLayer, setShowPlanLayer] = useState(true);
  const [showBuildLayer, setShowBuildLayer] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBOQModal, setShowBOQModal] = useState(false);
  const [boqItems, setBoqItems] = useState([]);
  const [approvals, setApprovals] = useState([]); // {id, refType, refId, status}
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  // helper: compute name for new pin
  const nextName = useMemo(() => `Pin-${projects.length + 1}`, [projects.length]);

  // Location clicker: add pin + auto connect last -> new as planned
  function LocationAdder() {
    useMapEvents({
      click(e) {
        const newId = Date.now() + Math.random();
        const newPin = { id: newId, name: nextName, pos: e.latlng, createdBy: currentUser.id };
        setProjects((prev) => {
          // auto connect previous
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            setCables((c) => [
              ...c,
              { id: Date.now() + Math.random(), fromId: last.id, toId: newId, status: "plan", createdBy: currentUser.id },
            ]);
          }
          return [...prev, newPin];
        });
      },
    });
    return null;
  }

  // rename pin
  const renamePin = (id, name) => setProjects((p) => p.map((x) => (x.id === id ? { ...x, name } : x)));

  // drag update
  const updatePinPos = (id, pos) => {
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, pos } : x)));
    // update cable geometries implicitly (they read pins)
  };

  // select pins (for manual connect)
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)));
  };

  const connectSelected = () => {
    if (selectedIds.length === 2) {
      const [a, b] = selectedIds;
      // skip duplicates
      if (!cables.some((c) => (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a))) {
        setCables((c) => [...c, { id: Date.now(), fromId: a, toId: b, status: "plan", createdBy: currentUser.id }]);
      }
      setSelectedIds([]);
    }
  };

  // delete functions
  const deletePin = (id) => {
    setProjects((p) => p.filter((x) => x.id !== id));
    setCables((c) => c.filter((x) => x.fromId !== id && x.toId !== id));
  };
  const deleteCable = (id) => setCables((c) => c.filter((x) => x.id !== id));

  // change cable status (plan -> build) — might require approval flow
  const setCableStatus = (id, status) => {
    // if vendor proposes change, create approval required for managers
    // simplified: if vendor role, create approval record
    if (currentUser.role === "vendor" && status === "build") {
      setApprovals((a) => [...a, { id: Date.now(), refType: "cable", refId: id, status: "pending", requestedBy: currentUser.id }]);
      return alert("Perubahan permintaan dikirim untuk approval");
    }
    setCables((c) => c.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  // BOQ quick add
  const addBoqItem = (item) => setBoqItems((b) => [...b, { ...item, id: Date.now() }]);

  // Export KML (client-side): convert to GeoJSON -> kml
  const exportKML = () => {
    // Build GeoJSON feature collection
    const featPins = projects.map((p) => ({
      type: "Feature",
      properties: { name: p.name, id: p.id },
      geometry: { type: "Point", coordinates: [p.pos.lng, p.pos.lat] },
    }));
    const featLines = cables
      .map((c) => {
        const f = projects.find((x) => x.id === c.fromId);
        const t = projects.find((x) => x.id === c.toId);
        if (!f || !t) return null;
        return {
          type: "Feature",
          properties: { id: c.id, name: `${f.name}→${t.name}`, status: c.status },
          geometry: { type: "LineString", coordinates: [[f.pos.lng, f.pos.lat], [t.pos.lng, t.pos.lat]] },
        };
      })
      .filter(Boolean);

    const geojson = { type: "FeatureCollection", features: [...featPins, ...featLines] };

    try {
      // If tokml installed:
      const exportToKMZ = async () => {
  const tokml = (await import("tokml")).default;

  const geojson = {
    type: "FeatureCollection",
    features: projects.map((p) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [p.position.lng, p.position.lat],
      },
      properties: { name: p.name },
    })),
  };

  const kml = tokml(geojson);
  const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
  saveAs(blob, "projects.kml");
};

    } catch (err) {
      // fallback: simple KML builder (we can reuse manual approach)
      let placemarks = "";
      featPins.forEach((pt) => {
        placemarks += `<Placemark><name>${pt.properties.name}</name><Point><coordinates>${pt.geometry.coordinates[0]},${pt.geometry.coordinates[1]},0</coordinates></Point></Placemark>`;
      });
      featLines.forEach((ln) => {
        placemarks += `<Placemark><name>${ln.properties.name}</name><LineString><coordinates>${ln.geometry.coordinates.map(c => c.join(",") + ",0").join(" " )}</coordinates></LineString></Placemark>`;
      });
      const kmlText = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`;
      saveAs(new Blob([kmlText], { type: "application/vnd.google-earth.kml+xml" }), "project-plan.kml");
    }
  };

  // Import KML simple: handle file, parse using DOMParser -> Points/LineString -> add
  const importKML = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");
      const placemarks = Array.from(xml.getElementsByTagName("Placemark"));
      const newPins = [];
      const newCables = [];
      placemarks.forEach((pm) => {
        const nameNode = pm.getElementsByTagName("name")[0];
        const name = nameNode ? nameNode.textContent.trim() : `Pin-${projects.length + newPins.length + 1}`;
        const point = pm.getElementsByTagName("Point")[0];
        const line = pm.getElementsByTagName("LineString")[0];
        if (point) {
          const coords = point.getElementsByTagName("coordinates")[0].textContent.trim();
          const [lng, lat] = coords.split(",").map(Number);
          const id = Date.now() + Math.random();
          newPins.push({ id, name, pos: { lat, lng }, imported: true });
        } else if (line) {
          const coordsText = line.getElementsByTagName("coordinates")[0].textContent.trim();
          const coords = coordsText.split(/\s+/).map((s) => s.split(",").map(Number));
          // find nearest pins for endpoints (very naive)
          if (coords.length >= 2) {
            const [lng1, lat1] = coords[0];
            const [lng2, lat2] = coords[coords.length - 1];
            // won't link on import to newly created pins automatically here; better approach: create pins then connect
            const id = Date.now() + Math.random();
            // store temporarily as line coords, later we can snap to nearest
            newCables.push({ id, coords, status: "plan", imported: true });
          }
        }
      });

      // Append pins
      setProjects((p) => [...p, ...newPins]);

      // For imported lines, try to snap endpoints to nearest pins (existing + newly added)
      setCables((prev) => {
        const allPins = [...projects, ...newPins];
        const snapped = newCables
          .map((nc) => {
            const [lng1, lat1] = nc.coords[0];
            const [lng2, lat2] = nc.coords[nc.coords.length - 1];
            const nearest = (lat, lng) => {
              let best = null;
              let bestDist = Infinity;
              allPins.forEach((pp) => {
                const d = (pp.pos.lat - lat) ** 2 + (pp.pos.lng - lng) ** 2;
                if (d < bestDist) {
                  bestDist = d;
                  best = pp.id;
                }
              });
              return best;
            };
            const fromId = nearest(lat1, lng1);
            const toId = nearest(lat2, lng2);
            if (fromId && toId && fromId !== toId) return { id: nc.id, fromId, toId, status: "plan" };
            return null;
          })
          .filter(Boolean);
        return [...prev, ...snapped];
      });

    } catch (err) {
      console.error("Import error", err);
      alert("Gagal import KML");
    } finally {
      setImporting(false);
    }
  };

  // Search function
  const filteredPins = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Example minimal approval action (manager approves)
  const approve = (approvalId, approve = true) => {
    setApprovals((a) => a.map((ap) => (ap.id === approvalId ? { ...ap, status: approve ? "approved" : "rejected", handledBy: currentUser.id } : ap)));
    // if approved, apply change (for example change cable status)
    const ap = approvals.find((x) => x.id === approvalId);
    if (ap && ap.refType === "cable" && approve) {
      setCables((c) => c.map((x) => (x.id === ap.refId ? { ...x, status: "build" } : x)));
    }
  };

  // BOQ modal simple UI (no backend)
  const BOQModal = () => {
    const [item, setItem] = useState({ desc: "", qty: 0, unit: "pcs", price: 0 });
    const add = () => {
      if (!item.desc || item.qty <= 0) return;
      setBoqItems((b) => [...b, { ...item, id: Date.now() }]);
      setItem({ desc: "", qty: 0, unit: "pcs", price: 0 });
      setShowBOQModal(false);
    };
    return (
      <Modal show={showBOQModal} onHide={() => setShowBOQModal(false)}>
        <Modal.Header closeButton><Modal.Title>Tambah BOQ</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2"><Form.Label>Deskripsi</Form.Label><Form.Control value={item.desc} onChange={e => setItem({...item, desc: e.target.value})} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Qty</Form.Label><Form.Control type="number" value={item.qty} onChange={e => setItem({...item, qty: Number(e.target.value)})} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Unit</Form.Label><Form.Control value={item.unit} onChange={e => setItem({...item, unit: e.target.value})} /></Form.Group>
          <Form.Group><Form.Label>Unit Price</Form.Label><Form.Control type="number" value={item.price} onChange={e => setItem({...item, price: Number(e.target.value)})} /></Form.Group>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowBOQModal(false)}>Batal</Button><Button variant="primary" onClick={add}>Tambah</Button></Modal.Footer>
      </Modal>
    );
  };

  return (
    <Container fluid className="p-2">
      <Row>
        <Col md={4} lg={3} className="bg-light p-3" style={{ height: "100vh", overflowY: "auto" }}>
          <div className="d-flex gap-2 mb-2">
            <Button variant="primary" onClick={() => setShowBOQModal(true)}>+ BOQ</Button>
            <Button variant="success" onClick={exportKML}>Export KML</Button>
            <Button variant="outline-secondary" onClick={() => fileRef.current?.click()}>Import KML</Button>
            <input ref={fileRef} type="file" accept=".kml" hidden onChange={(e) => importKML(e.target.files?.[0])} />
          </div>

          <div className="mb-3">
            <LayerToggle value={showPlanLayer} onChange={setShowPlanLayer} label="Layer: Build as plan" />
            <LayerToggle value={showBuildLayer} onChange={setShowBuildLayer} label="Layer: Build as build" />
          </div>

          <InputGroup className="mb-3">
            <Form.Control placeholder="Cari pin/asset..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outline-secondary" onClick={() => setSearch("")}>Clear</Button>
          </InputGroup>

          <h6>Pins</h6>
          <ListGroup className="mb-3">
            {filteredPins.length === 0 && <ListGroup.Item className="text-muted">No pins</ListGroup.Item>}
            {filteredPins.map((p) => (
              <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-center">
                <div style={{ flex: 1 }}>
                  <div className="fw-bold">{p.name}</div>
                  <small className="text-muted">{p.pos.lat.toFixed(6)}, {p.pos.lng.toFixed(6)}</small>
                </div>
                <div className="d-flex gap-1">
                  <Button size="sm" variant={selectedIds.includes(p.id) ? "success" : "outline-primary"} onClick={() => toggleSelect(p.id)}>{selectedIds.includes(p.id) ? "Dipilih" : "Pilih"}</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => deletePin(p.id)}>Hapus</Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>

          <h6>BOQ</h6>
          <ListGroup className="mb-3">
            {boqItems.length === 0 && <ListGroup.Item className="text-muted">Belum ada BOQ</ListGroup.Item>}
            {boqItems.map((b) => (<ListGroup.Item key={b.id}>{b.desc} • {b.qty} {b.unit} • Rp {b.price}</ListGroup.Item>))}
          </ListGroup>

          <h6>Approvals</h6>
          <ListGroup>
            {approvals.length === 0 && <ListGroup.Item className="text-muted">No approvals</ListGroup.Item>}
            {approvals.map((ap) => (
              <ListGroup.Item key={ap.id} className="d-flex justify-content-between align-items-center">
                <div>{ap.refType}#{ap.refId} • {ap.status}</div>
                {currentUser.role === "manager" && ap.status === "pending" ? (
                  <div className="d-flex gap-1">
                    <Button size="sm" variant="success" onClick={() => approve(ap.id, true)}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => approve(ap.id, false)}>Reject</Button>
                  </div>
                ) : <div className="small text-muted">Requested by {ap.requestedBy}</div>}
              </ListGroup.Item>
            ))}
          </ListGroup>

          <BOQModal />
        </Col>

        <Col md={8} lg={9} className="p-0">
          <MapContainer center={[-6.48167, 106.85417]} zoom={15} style={{ height: "100vh", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <LocationAdder />

            {/* LayersControl optional: separate plan/build into layer groups */}
            <LayersControl position="topright">
              <LayersControl.Overlay checked name="Plan (dashed)">
                <LayerGroup>
                  {showPlanLayer && cables.filter(c => c.status === "plan").map((c) => {
                    const a = projects.find(p => p.id === c.fromId);
                    const b = projects.find(p => p.id === c.toId);
                    if (!a || !b) return null;
                    return <Polyline key={c.id} positions={[a.pos, b.pos]} color="blue" dashArray="6" weight={3} />;
                  })}
                </LayerGroup>
              </LayersControl.Overlay>
              <LayersControl.Overlay checked name="Build (solid)">
                <LayerGroup>
                  {showBuildLayer && cables.filter(c => c.status === "build").map((c) => {
                    const a = projects.find(p => p.id === c.fromId);
                    const b = projects.find(p => p.id === c.toId);
                    if (!a || !b) return null;
                    return <Polyline key={c.id} positions={[a.pos, b.pos]} color="orange" weight={4} />;
                  })}
                </LayerGroup>
              </LayersControl.Overlay>
            </LayersControl>

            {/* markers */}
            {projects.map((p) => (
              <Marker
                key={p.id}
                position={p.pos}
                draggable
                eventHandlers={{
                  dragend: (e) => updatePinPos(p.id, e.target.getLatLng()),
                }}
              >
                <Popup>
                  <div><strong>{p.name}</strong></div>
                  <Form.Control size="sm" value={p.name} onChange={(e) => renamePin(p.id, e.target.value)} />
                  <div className="mt-1 small text-muted">{p.pos.lat.toFixed(6)}, {p.pos.lng.toFixed(6)}</div>
                  <div className="d-flex gap-1 mt-2">
                    <Button size="sm" variant="outline-primary" onClick={() => toggleSelect(p.id)}>{selectedIds.includes(p.id) ? "Unselect" : "Select"}</Button>
                    <Button size="sm" variant="danger" onClick={() => deletePin(p.id)}>Delete</Button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* all cables (for easy selection / editing) */}
            {cables.map((c) => {
              const a = projects.find(p => p.id === c.fromId);
              const b = projects.find(p => p.id === c.toId);
              if (!a || !b) return null;
              const color = c.status === "build" ? "orange" : "blue";
              return <Polyline key={c.id} positions={[a.pos, b.pos]} color={color} weight={4} />;
            })}
          </MapContainer>
        </Col>
      </Row>
    </Container>
  );
};

export default Project;
