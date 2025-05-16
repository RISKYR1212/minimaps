// ... (import dan ikon Leaflet tetap sama)

function Maps() {
  const defaultLocation = { lat: -6.511809, lng: 106.8128 }
  const [locationQuery, setLocationQuery] = useState('')
  const [layerFilter, setLayerFilter] = useState('')
  const [foundMarker, setFoundMarker] = useState(null)
  const [layers, setLayers] = useState(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem('savedLayers')
    return saved ? JSON.parse(saved) : [
      { name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }
    ]
  })

  // Save to localStorage whenever layers change
  React.useEffect(() => {
    localStorage.setItem('savedLayers', JSON.stringify(layers))
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Sidebar */}
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
                  className="form-control form-control-sm mb-2"
                  onChange={e => handleFileChange(e, idx)}
                />
                <Button size="sm" variant="outline-success" className="w-100" onClick={() => downloadKml(layer)}>
                   Download KML
                </Button>
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
  url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
  maxZoom={25}
  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
/>


        {locationQuery && (
          <SearchLocationHandler query={locationQuery} onFound={setFoundMarker} />
        )}

        {foundMarker && (
          <Marker position={foundMarker}>
            <Popup> Lokasi ditemukan</Popup>
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
