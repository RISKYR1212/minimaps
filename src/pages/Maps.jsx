// ... import tetap sama
import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Button, Form, Dropdown, Modal, InputGroup, FormControl} from 'react-bootstrap'
import * as toGeoJSON from '@tmcw/togeojson'

const Maps = () => {
  const Location = [
    { lat: -6.511809, long: 106.8128 },
    { lat: -6.512583, long: 106.812691 },
    { lat: -6.513749, long: 106.813577 }
  ]

  const polylinePositions = Location.map(loc => [loc.lat, loc.long])
  const polylineOption = { color: 'blue' }

  const [layers, setLayers] = useState([
    { nama: 'Lapisan tanpa judul', visible: true, Marker: [], Polyline: [] }
  ])
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null)
  const [renameInput, setRenameInput] = useState('')

  const toggleLayerVisibility = index => {
    const updated = [...layers]
    updated[index].visible = !updated[index].visible
    setLayers(updated)
  }

  const addNewLayer = () => {
    setLayers([
      ...layers,
      { nama: 'Lapisan baru', visible: true, Marker: [], Polyline: [] }
    ])
  }
  
  const deleteLayer = index => {
    if (window.confirm("Yakin ingin menghapus lapisan ini?")) {
      const updated = [...layers]
      updated.splice(index, 1)
      setLayers(updated)
    }
  }
  
  const handleRename = () => {
    const updated = [...layers]
    updated[selectedLayerIndex].nama = renameInput
    setLayers(updated)
    setShowRenameModal(false)
  }
  

  const handleKMLImport = (event, layerIndex) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const parser = new DOMParser()
      const kml = parser.parseFromString(e.target.result, 'text/xml')
      const geojson = toGeoJSON.kml(kml)

      const newMarkers = []
      const newPolylines = []

      geojson.features.forEach((f, i) => {
        if (f.geometry.type === 'Point') {
          newMarkers.push({
            lat: f.geometry.coordinates[1],
            long: f.geometry.coordinates[0],
            label: f.properties.name || `Point ${i + 1}`
          })
        } else if (f.geometry.type === 'LineString') {
          const coords = f.geometry.coordinates.map(c => [c[1], c[0]]) // lat, long
          newPolylines.push({
            positions: coords,
            label: f.properties.name || `Polyline ${i + 1}`
          })
        }
      })

      const updated = [...layers]
      updated[layerIndex].Marker.push(...newMarkers)
      updated[layerIndex].Polyline.push(...newPolylines)
      setLayers(updated)
    }

    reader.readAsText(file)
  }

  return (
    <div className="position-relative" style={{ height: '100vh', width: '100%' }}>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: '280px',
        maxHeight: '90vh',
        overflowY: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <h5 className="fw-bold">Peta tanpa judul</h5>

        <div className="d-flex gap-2 mb-3">
          <Button variant="primary" size="sm" onClick={addNewLayer}>Tambahkan lapisan</Button>
          <Button variant="secondary" size="sm">Bagikan</Button>
        </div>

        {layers.map((layer, idx) => (
          <Card key={idx} className="mb-2">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <Form.Check
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleLayerVisibility(idx)}
                  label={layer.nama}
                />
                <Dropdown>
                  <Dropdown.Toggle variant="light" size="sm" id="dropdown-basic">⋮</Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => {
                      setSelectedLayerIndex(idx)
                      setRenameInput(layer.nama)
                      setShowRenameModal(true)
                    }}>Rename</Dropdown.Item>
                    <Dropdown.Item onClick={() => deleteLayer(idx)}>Hapus</Dropdown.Item>
                    <Dropdown.Item as="label">
                      Import KML
                      <input
                        type="file"
                        accept=".kml"
                        hidden
                        onChange={(e) => handleKMLImport(e, idx)}
                      />
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <MapContainer
        center={[Location[0].lat, Location[0].long]}
        zoom={18}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={polylinePositions} pathOptions={polylineOption} />
        {Location.map((L, index) => (
          <Marker key={index} position={[L.lat, L.long]}>
            <Popup>marker {index + 1}</Popup>
          </Marker>
        ))}
        {layers.map(
          (layer, idx) =>
            layer.visible && (
              <LayerGroup key={`layer-${idx}`}>
                {layer.Marker.map((marker, mIdx) => (
                  <Marker key={`marker-${mIdx}`} position={[marker.lat, marker.long]}>
                    <Popup>{marker.label}</Popup>
                  </Marker>
                ))}
                {layer.Polyline.map((line, lIdx) => (
                  <Polyline
                    key={`polyline-${lIdx}`}
                    positions={line.positions}
                    pathOptions={{ color: 'red' }}
                  >
                    <Popup>{line.label}</Popup>
                  </Polyline>
                ))}
              </LayerGroup>
            )
        )}
      </MapContainer>

      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ubah Nama Lapisan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup>
            <FormControl
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder="Nama lapisan baru"
            />
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenameModal(false)}>Batal</Button>
          <Button variant="primary" onClick={handleRename}>Simpan</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Maps
