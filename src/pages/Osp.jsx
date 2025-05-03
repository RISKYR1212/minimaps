import React, { useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayerGroup,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Form, FormControl, Button, InputGroup } from 'react-bootstrap'
import * as toGeoJSON from '@tmcw/togeojson'
import JSZip from 'jszip'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

function SearchLocationHandler({ query, onFound }) {
  const map = useMap()
  React.useEffect(() => {
    const fetchLocation = async () => {
      if (!query) return
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
        const data = await res.json()
        if (data && data.length > 0) {
          const loc = data[0]
          const latlng = [parseFloat(loc.lat), parseFloat(loc.lon)]
          map.setView(latlng, 18)
          onFound(latlng)
        } else {
          alert('Lokasi tidak ditemukan.')
        }
      } catch (err) {
        alert('Terjadi kesalahan saat mencari lokasi.')
        console.error(err)
      }
    }
    fetchLocation()
  }, [query, map, onFound])
  return null
}

function Maps() {
  const defaultLocation = { lat: -6.511809, lng: 106.8128 }
  const [locationQuery, setLocationQuery] = useState('')
  const [layerFilter, setLayerFilter] = useState('')
  const [foundMarker, setFoundMarker] = useState(null)
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

  const extractGeometries = (feature) => {
    const geometries = []
    if (feature.geometry.type === 'MultiGeometry' || feature.geometry.type === 'GeometryCollection') {
      for (const geom of feature.geometry.geometries) {
        geometries.push({ ...feature, geometry: geom })
      }
    } else {
      geometries.push(feature)
    }
    return geometries
  }

  const updateLayer = (geojson, name, idx) => {
    const markers = []
    const polylines = []
    geojson.features?.forEach((feature, i) => {
      const extracted = extractGeometries(feature)
      extracted.forEach((f, j) => {
        const label = f.properties?.name || `${f.geometry.type} ${i + 1}-${j + 1}`
        if (f.geometry.type === 'Point') {
          const [lng, lat] = f.geometry.coordinates
          markers.push({ lat, lng, label })
        } else if (f.geometry.type === 'LineString') {
          const coords = f.geometry.coordinates.map(([lng, lat]) => [lat, lng])
          polylines.push({ positions: coords, label })
        }
      })
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
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: 320,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 12,
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 8,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <h5>🗂️ Layers KML/KMZ</h5>
        <Button size="sm" onClick={addLayer} className="mb-3 w-100">➕ Tambah Layer</Button>
        <FormControl
          placeholder="🔍 Filter nama layer..."
          value={layerFilter}
          onChange={e => setLayerFilter(e.target.value)}
          className="mb-2"
        />
        <InputGroup className="mb-2">
          <FormControl
            placeholder="📍 Cari lokasi (misal: Bogor)"
            value={locationQuery}
            onChange={e => setLocationQuery(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setLocationQuery(locationQuery)}>Cari</Button>
        </InputGroup>
        {layers
          .filter(layer => layer.name.toLowerCase().includes(layerFilter.toLowerCase()))
          .map((layer, idx) => (
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
                    style={{ width: 30, height: 30 }}
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
      <MapContainer
        center={[defaultLocation.lat, defaultLocation.lng]}
        zoom={18}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={25}
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />
        {locationQuery && (
          <SearchLocationHandler query={locationQuery} onFound={setFoundMarker} />
        )}
        {foundMarker && (
          <Marker position={foundMarker}>
            <Popup>📍 Lokasi ditemukan</Popup>
          </Marker>
        )}
        {layers
          .filter(layer => layer.visible && layer.name.toLowerCase().includes(layerFilter.toLowerCase()))
          .map((layer, idx) => (
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
