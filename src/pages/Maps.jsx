import React, { useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayerGroup
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Form, FormControl, Button } from 'react-bootstrap'
import * as toGeoJSON from '@tmcw/togeojson'
import JSZip from 'jszip'

// Fix missing marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

function Maps() {
  const defaultLocation = { lat: -6.511809, lng: 106.8128 }
  const [layers, setLayers] = useState([
    { name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }
  ])

  const parseFile = async (file, idx) => {
    try {
      let content = ''
      if (file.name.toLowerCase().endsWith('.kmz')) {
        const buffer = await file.arrayBuffer()
        const zip = await JSZip.loadAsync(buffer)
        const kmlEntry = Object.keys(zip.files).find(name => name.match(/\.kml$/i))
        if (!kmlEntry) throw new Error('KMZ tidak mengandung file .kml')
        content = await zip.file(kmlEntry).async('text')
      } else {
        content = await file.text()
      }

      const kmlDom = new DOMParser().parseFromString(content, 'text/xml')
      const geojson = toGeoJSON.kml(kmlDom)
      updateLayer(geojson, file.name.replace(/\.(kml|kmz)$/i, ''), idx)
    } catch (err) {
      console.error('Gagal memproses file:', err)
    }
  }

  const updateLayer = (geojson, name, idx) => {
    const markers = []
    const polylines = []

    geojson.features?.forEach((feature, i) => {
      const label = feature.properties?.name || `${feature.geometry.type} ${i + 1}`

      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates
        markers.push({ lat, lng, label })
      } else if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        polylines.push({ positions: coords, label })
      }
    })

    setLayers(prev => {
      const newLayers = [...prev]
      newLayers[idx] = { ...newLayers[idx], name, markers, polylines }
      return newLayers
    })
  }

  const handleFileChange = (e, idx) => {
    const file = e.target.files[0]
    if (file) parseFile(file, idx)
    e.target.value = ''
  }

  const addLayer = () => {
    setLayers(prev => [
      ...prev,
      {
        name: `Layer ${prev.length + 1}`,
        visible: true,
        markers: [],
        polylines: [],
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
      }
    ])
  }

  const toggleVisibility = idx => {
    setLayers(prev =>
      prev.map((layer, i) => i === idx ? { ...layer, visible: !layer.visible } : layer)
    )
  }

  const updateColor = (idx, color) => {
    setLayers(prev =>
      prev.map((layer, i) => i === idx ? { ...layer, color } : layer)
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: 300,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 12,
        background: 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <h5>Layers KML/KMZ</h5>
        <Button size="sm" onClick={addLayer} className="mb-3">
          Tambah Layer
        </Button>

        {layers.map((layer, idx) => (
          <Card key={idx} className="mt-2">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <Form.Check
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleVisibility(idx)}
                  label={layer.name}
                  className="me-2"
                />
                <FormControl
                  type="color"
                  value={layer.color}
                  onChange={e => updateColor(idx, e.target.value)}
                  style={{ width: 30, height: 30, padding: 1 }}
                />
              </div>
              <input
                type="file"
                accept=".kml,.kmz"
                className="form-control form-control-sm"
                onChange={e => handleFileChange(e, idx)}
              />
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Map */}
      <MapContainer
        center={[defaultLocation.lat, defaultLocation.lng]}
        zoom={18}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {layers.map((layer, idx) => layer.visible && (
          <LayerGroup key={idx}>
            {layer.markers.map((marker, i) => (
              <Marker key={i} position={[marker.lat, marker.lng]}>
                <Popup><strong>{marker.label}</strong></Popup>
              </Marker>
            ))}
            {layer.polylines.map((polyline, i) => (
              <Polyline
                key={i}
                positions={polyline.positions}
                pathOptions={{ color: layer.color }}
              >
                <Popup><strong>{polyline.label}</strong></Popup>
              </Polyline>
            ))}
          </LayerGroup>
        ))}
      </MapContainer>
    </div>
  )
}

export default Maps
