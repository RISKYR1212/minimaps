import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Button,
  Form,
  ListGroup,
  Container,
  Row,
  Col,
  InputGroup,
} from "react-bootstrap";

// Fix icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const Project = () => {
  const [projects, setProjects] = useState([]);
  const [cables, setCables] = useState([]);
  const [selectedPins, setSelectedPins] = useState([]);

  // Add marker on map click
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const newProject = {
          id: Date.now(),
          name: `Pin-${projects.length + 1}`,
          position: e.latlng,
        };
        setProjects((prev) => [...prev, newProject]);
      },
    });
    return null;
  };

  // Rename project from sidebar or popup
  const renameProject = (id, newName) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  // Handle pin selection for creating cables
  const handleSelectPin = (project) => {
    if (selectedPins.length === 1 && selectedPins[0].id !== project.id) {
      const newCable = {
        id: Date.now(),
        from: selectedPins[0],
        to: project,
        path: [selectedPins[0].position, project.position],
      };
      setCables((prev) => [...prev, newCable]);
      setSelectedPins([]);
    } else {
      setSelectedPins([project]);
    }
  };

  // Update position when marker dragged
  const updateMarkerPosition = (id, newPos) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, position: newPos } : p))
    );
  };

  return (
    <Container fluid>
      <Row>
        {/* Sidebar */}
        <Col md={3} className="p-3 bg-light" style={{ height: "100vh", overflowY: "auto" }}>
          <h5 className="mb-3">📍 Daftar Project</h5>
          {projects.length === 0 && <p>Belum ada pin. Klik peta untuk menambah.</p>}
          <ListGroup className="mb-4">
            {projects.map((p) => (
              <ListGroup.Item key={p.id} className="mb-2">
                <InputGroup size="sm">
                  <Form.Control
                    value={p.name}
                    onChange={(e) => renameProject(p.id, e.target.value)}
                  />
                  <Button
                    variant={
                      selectedPins.find((sp) => sp.id === p.id)
                        ? "success"
                        : "outline-primary"
                    }
                    onClick={() => handleSelectPin(p)}
                  >
                    {selectedPins.find((sp) => sp.id === p.id)
                      ? "Selected"
                      : "Select"}
                  </Button>
                </InputGroup>
                <small className="text-muted">
                  Lat: {p.position.lat.toFixed(4)}, Lng: {p.position.lng.toFixed(4)}
                </small>
              </ListGroup.Item>
            ))}
          </ListGroup>

          <h6>🔗 Kabel</h6>
          <ListGroup>
            {cables.map((c) => (
              <ListGroup.Item key={c.id}>
                {c.from.name} → {c.to.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        {/* Map Area */}
        <Col md={9} className="p-0">
          <MapContainer
            center={[-6.48167, 106.85417]}
            zoom={20}
            style={{ height: "95vh", width: "200vh" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <LocationMarker />

            {projects.map((p) => (
              <Marker
                key={p.id}
                position={p.position}
                draggable
                eventHandlers={{
                  click: () => handleSelectPin(p),
                  dragend: (e) => {
                    const newPos = e.target.getLatLng();
                    updateMarkerPosition(p.id, newPos);
                  },
                }}
              >
                <Popup>
                  <b>{p.name}</b>
                  <br />
                  <Form.Control
                    className="mt-2"
                    value={p.name}
                    onChange={(e) => renameProject(p.id, e.target.value)}
                  />
                </Popup>
              </Marker>
            ))}

            {cables.map((c) => (
              <Polyline key={c.id} positions={c.path} color="orange" weight={4} />
            ))}
          </MapContainer>
        </Col>
      </Row>
    </Container>
  );
};

export default Project;
