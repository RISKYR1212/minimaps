import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Form, FormControl, Button, Alert } from 'react-bootstrap'
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

  useEffect(() => {
    const fetchLocation = async () => {
      if (!query) return
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
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
  const [inputLocation, setInputLocation] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [foundMarker, setFoundMarker] = useState(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [layerFilter, setLayerFilter] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState(null)

  const [layers, setLayers] = useState(() => {
    // Load dari localStorage kalau ada
    const saved = localStorage.getItem('layersData')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return [
          { name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }
        ]
      }
    }
    return [
      { name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }
    ]
  })

  // Simpan layers ke localStorage tiap ada perubahan
  useEffect(() => {
    localStorage.setItem('layersData', JSON.stringify(layers))
  }, [layers])

  const escapeXml = str =>
    str?.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

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
      alert(`Gagal membuka file ${file.name}: ${err.message}`)
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
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      }
    ])
  }

  // Fungsi untuk menghapus layer
  const removeLayer = (idx) => {
    if (layers.length <= 1) {
      alert('Anda harus memiliki setidaknya satu layer')
      return
    }
    
    if (window.confirm(`Apakah Anda yakin ingin menghapus layer "${layers[idx].name}"?`)) {
      setLayers(prev => prev.filter((_, i) => i !== idx))
    }
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

  const generateKmlFromLayer = (layer) => {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${escapeXml(layer.name)}</name>`
    const kmlFooter = `</Document></kml>`

    const placemarks = []

    for (const marker of layer.markers) {
      placemarks.push(`
        <Placemark>
          <name>${escapeXml(marker.label)}</name>
          <Point>
            <coordinates>${marker.lng},${marker.lat},0</coordinates>
          </Point>
        </Placemark>
      `)
    }

    for (const line of layer.polylines) {
      const coordStr = line.positions.map(([lat, lng]) => `${lng},${lat},0`).join(' ')
      placemarks.push(`
        <Placemark>
          <name>${escapeXml(line.label)}</name>
          <Style><LineStyle><color>ff${layer.color.slice(1)}</color><width>3</width></LineStyle></Style>
          <LineString>
            <tessellate>1</tessellate>
            <coordinates>${coordStr}</coordinates>
          </LineString>
        </Placemark>
      `)
    }

    return `${kmlHeader}${placemarks.join('')}${kmlFooter}`
  }

  const downloadKml = (layer) => {
    const kmlContent = generateKmlFromLayer(layer)
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${layer.name}.kml`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Fungsi mendapatkan lokasi user
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolokasi tidak didukung oleh browser Anda.')
      return
    }
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        setFoundMarker([latitude, longitude])
      },
      error => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Izin lokasi ditolak.')
            break
          case error.POSITION_UNAVAILABLE:
            setGeoError('Informasi lokasi tidak tersedia.')
            break
          case error.TIMEOUT:
            setGeoError('Permintaan lokasi habis waktu.')
            break
          default:
            setGeoError('Terjadi kesalahan saat mendapatkan lokasi.')
        }
        console.error(error)
      }
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Tombol toggle sidebar */}
      <Button
        size="sm"
        variant="primary"
        onClick={() => setSidebarVisible(!sidebarVisible)}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 1100
        }}
      >
        {sidebarVisible ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
      </Button>

      {/* Sidebar */}
      {sidebarVisible && (
        <div style={{
          position: 'absolute',
          top: 60,
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
          <h5>🔍 Cari Lokasi</h5>
          <Form
            onSubmit={e => {
              e.preventDefault()
              setLocationQuery(inputLocation.trim())
            }}
            className="mb-3"
          >
            <FormControl
              type="text"
              placeholder="Cari lokasi..."
              value={inputLocation}
              onChange={e => setInputLocation(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="mt-2 w-100"
              disabled={!inputLocation.trim()}
            >
              Cari
            </Button>
          </Form>

          <Button
            variant="success"
            size="sm"
            className="mb-3 w-100"
            onClick={getCurrentLocation}
          >
             Dapatkan Lokasi Saya
          </Button>

          {geoError && <Alert variant="danger">{geoError}</Alert>}

          <h5> Layers KML/KMZ</h5>
          <Button size="sm" onClick={addLayer} className="mb-3 w-100">
            Tambah Layer
          </Button>
          <FormControl
            placeholder="🔍 Filter nama layer..."
            value={layerFilter}
            onChange={e => setLayerFilter(e.target.value)}
            className="mb-2"
          />
          {layers
            .filter(layer => layer.name.toLowerCase().includes(layerFilter.toLowerCase()))
            .map((layer, idx) => (
              <Card key={idx} className="mb-2">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Check 
                      type="checkbox" 
                      id={`visible-layer-${idx}`}
                      label={`Tampilkan ${layer.name}`}
                      checked={layer.visible}
                      onChange={() => toggleVisibility(idx)}
                    />
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => removeLayer(idx)}
                      disabled={layers.length <= 1}
                    >
                      Hapus
                    </Button>
                  </div>
                  <Form.Control
                    type="text"
                    value={layer.name}
                    onChange={e => {
                      const newName = e.target.value
                      setLayers(prev => {
                        const newLayers = [...prev]
                        newLayers[idx].name = newName
                        return newLayers
                      })
                    }}
                    className="mt-1 mb-1"
                    placeholder="Nama layer"
                  />
                  <Form.Control
                    type="color"
                    value={layer.color}
                    title="Pilih warna layer"
                    onChange={e => updateColor(idx, e.target.value)}
                    className="mb-1"
                  />
                  <Form.Control
                    type="file"
                    accept=".kml,.kmz"
                    onChange={e => handleFileChange(e, idx)}
                    className="mb-1"
                  />
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => downloadKml(layer)}
                    className="w-100"
                  >
                    Export KML
                  </Button>
                </Card.Body>
              </Card>
            ))}
        </div>
      )}

      {/* Peta */}
      <MapContainer
        center={[defaultLocation.lat, defaultLocation.lng]}
        zoom={25}
        maxZoom={20}
        scrollWheelZoom={true}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marker hasil pencarian */}
        {foundMarker && (
          <Marker position={foundMarker}>
            <Popup>
              totol pencarian
            </Popup>
          </Marker>
        )}

        {/* Marker lokasi user */}
        {userLocation && (
          <Marker position={userLocation} icon={L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
            className: 'user-location-marker'
          })}>
            <Popup>
              gua disini
            </Popup>
          </Marker>
        )}

        {/* Render layers */}
        {layers.map((layer, idx) => (
          layer.visible && (
            <LayerGroup key={idx}>
              {/* Marker di layer */}
              {layer.markers.map((marker, mIdx) => (
                <Marker
                  key={`marker-${idx}-${mIdx}`}
                  position={[marker.lat, marker.lng]}
                >
                  <Popup>{marker.label}</Popup>
                </Marker>
              ))}

              {/* Polyline di layer */}
              {layer.polylines.map((polyline, pIdx) => (
                <Polyline
                  key={`polyline-${idx}-${pIdx}`}
                  positions={polyline.positions}
                  pathOptions={{ color: layer.color }}
                >
                  <Popup>{polyline.label}</Popup>
                </Polyline>
              ))}
            </LayerGroup>
          )
        ))}

        {/* Komponen pencarian */}
        <SearchLocationHandler query={locationQuery} onFound={setFoundMarker} />
      </MapContainer>
    </div>
  )
}

export default Maps