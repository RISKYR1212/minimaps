// Project.jsx
import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Form, ListGroup, Container, Row, Col, InputGroup, } from "react-bootstrap";

const Project = () => {
  const [projects, setProjects] = useState([]);
  const [cables, setCables] = useState([]);
  const [selectedPins, setSelectedPins] = useState([]);

  // Tambah marker dengan klik peta
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const name = prompt("Masukkan nama project:");
        if (name) {
          const newProject = {
            id: Date.now(),
            name,
            position: e.latlng,
          };
          setProjects((prev) => [...prev, newProject]);
        }
      },
    });
    return null;
  };

  // Fungsi rename project
  const renameProject = (id) => {
    const newName = prompt("Masukkan nama baru:");
    if (newName) {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
      );
    }
  };

  // Klik marker untuk pilih kabel
  const handleSelectPin = (project) => {
    if (selectedPins.length === 1 && selectedPins[0].id !== project.id) {
      // buat kabel baru
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

  return (
    <Container fluid>
      <Row>
        {/* Sidebar daftar project */}
        <Col md={3} className="p-3 bg-light">
          <h5>Daftar Project</h5>
          {projects.length === 0 && <p>Belum ada project</p>}
          <ListGroup>
            {projects.map((p) => (
              <ListGroup.Item key={p.id}>
                <InputGroup>
                  <Form.Control value={p.name} readOnly />
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => renameProject(p.id)}
                  >
                    Rename
                  </Button>
                </InputGroup>
                <small>
                  Lat: {p.position.lat.toFixed(4)}, Lng:{" "}
                  {p.position.lng.toFixed(4)}
                </small>
              </ListGroup.Item>
            ))}
          </ListGroup>
          <hr />
          <h6>Kabel</h6>
          <ListGroup>
            {cables.map((c) => (
              <ListGroup.Item key={c.id}>
                {c.from.name} → {c.to.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        {/* Peta */}
        <Col md={9}>
          <MapContainer
            center={[-6.48167, 106.85417]}
            zoom={13}
            style={{ height: "100vh", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <LocationMarker />

            {/* Render marker project */}
            {projects.map((p) => (
              <Marker
                key={p.id}
                position={p.position}
                eventHandlers={{
                  click: () => handleSelectPin(p),
                }}
              >
                <Popup>
                  <b>{p.name}</b> <br />
                  {p.position.lat.toFixed(4)}, {p.position.lng.toFixed(4)} <br />
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => renameProject(p.id)}
                  >
                    Rename
                  </Button>
                </Popup>
              </Marker>
            ))}

            {/* Render kabel */}
            {cables.map((c) => (
              <Polyline key={c.id} positions={c.path} color="orange" />
            ))}
          </MapContainer>
        </Col>
      </Row>
    </Container>
  );
};

export default Project;
