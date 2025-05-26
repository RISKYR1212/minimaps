import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import * as toGeoJSON from '@tmcw/togeojson';
import JSZip from 'jszip';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Komponen untuk menggerakkan view map ke lokasi tertentu
function FlyToLocation({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.flyTo(location, 18, {
        duration: 1,
        easeLinearity: 0.25
      });
    }
  }, [location, map]);

  return null;
}

// Komponen pencarian lokasi
function SearchLocationHandler({ query, onFound }) {
  const map = useMap();

  useEffect(() => {
    const fetchLocation = async () => {
      if (!query) return;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        if (data?.length > 0) {
          const loc = data[0];
          const latlng = [parseFloat(loc.lat), parseFloat(loc.lon)];
          onFound(latlng);
        } else {
          alert('Lokasi tidak ditemukan.');
        }
      } catch (err) {
        alert('Terjadi kesalahan saat mencari lokasi.');
        console.error(err);
      }
    };

    const timer = setTimeout(fetchLocation, 500);
    return () => clearTimeout(timer);
  }, [query, map, onFound]);

  return null;
}

// Helper functions dengan encode/decode yang lebih aman
const encodeLayers = (layers) => {
  const simplified = layers.map(layer => ({
    n: layer.name,
    v: layer.visible,
    c: layer.color,
    m: layer.markers,
    p: layer.polylines
  }));
  return encodeURIComponent(JSON.stringify(simplified));
};

const decodeLayers = (encoded) => {
  try {
    const decoded = JSON.parse(decodeURIComponent(encoded));
    return decoded.map(layer => ({
      name: layer.n || 'Layer',
      visible: layer.v !== undefined ? layer.v : true,
      color: layer.c || '#ff0000',
      markers: layer.m || [],
      polylines: layer.p || []
    }));
  } catch {
    return [{ name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }];
  }
};

const escapeXml = (str) => {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

function Maps() {
  const defaultLocation = [-6.511809, 106.8128];
  const [inputLocation, setInputLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [foundMarker, setFoundMarker] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [layerFilter, setLayerFilter] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const fileInputRefs = useRef([]);

  // Initialize layers
  const [layers, setLayers] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLayers = params.get('layers');
    if (urlLayers) return decodeLayers(urlLayers);

    const saved = localStorage.getItem('layersData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [{ name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }];
      }
    }
    return [{ name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }];
  });

  // Update URL and localStorage
  useEffect(() => {
    localStorage.setItem('layersData', JSON.stringify(layers));
    const params = new URLSearchParams(window.location.search);
    params.set('layers', encodeLayers(layers));
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [layers]);

  const parseFile = async (file, idx) => {
    try {
      let content = '';
      if (file.name.toLowerCase().endsWith('.kmz')) {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const kmlEntry = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
        if (!kmlEntry) throw new Error('KMZ tidak mengandung file .kml');
        content = await zip.file(kmlEntry).async('text');
      } else {
        content = await file.text();
      }

      const kmlDom = new DOMParser().parseFromString(content, 'text/xml');
      const geojson = toGeoJSON.kml(kmlDom);
      updateLayer(geojson, file.name.replace(/\.(kml|kmz)$/i, ''), idx);
    } catch (err) {
      alert(`Gagal membuka file ${file.name}: ${err.message}`);
      console.error('Gagal memproses file:', err);
    }
  };

  const updateLayer = (geojson, name, idx) => {
    const markers = [];
    const polylines = [];

    geojson.features?.forEach((feature, i) => {
      const label = feature.properties?.name || `${feature.geometry.type} ${i + 1}`;
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        markers.push({ lat, lng, label });
      } else if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        polylines.push({ positions: coords, label });
      }
    });

    setLayers(prev => {
      const newLayers = [...prev];
      newLayers[idx] = { ...newLayers[idx], name, markers, polylines };
      return newLayers;
    });
  };

  const handleFileChange = (e, idx) => {
    const file = e.target.files[0];
    if (file) parseFile(file, idx);
    e.target.value = ''; // Reset input file
  };

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
    ]);
  };

  const removeLayer = (idx) => {
    if (layers.length <= 1) {
      alert('Anda harus memiliki setidaknya satu layer');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus layer "${layers[idx].name}"?`)) {
      setLayers(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const toggleVisibility = (idx) => {
    setLayers(prev =>
      prev.map((layer, i) => (i === idx ? { ...layer, visible: !layer.visible } : layer))
    );
  };

  const updateColor = (idx, color) => {
    setLayers(prev =>
      prev.map((layer, i) => (i === idx ? { ...layer, color } : layer))
    );
  };

  const generateKmlFromLayer = (layer) => {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(layer.name)}</name>`;

    const kmlFooter = `
  </Document>
</kml>`;

    const placemarks = [];

    layer.markers.forEach(marker => {
      placemarks.push(`
    <Placemark>
      <name>${escapeXml(marker.label)}</name>
      <Point>
        <coordinates>${marker.lng},${marker.lat},0</coordinates>
      </Point>
    </Placemark>`);
    });

    layer.polylines.forEach(line => {
      const coordStr = line.positions.map(([lat, lng]) => `${lng},${lat},0`).join(' ');
      placemarks.push(`
    <Placemark>
      <name>${escapeXml(line.label)}</name>
      <Style>
        <LineStyle>
          <color>ff${layer.color.slice(1)}</color>
          <width>3</width>
        </LineStyle>
      </Style>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordStr}</coordinates>
      </LineString>
    </Placemark>`);
    });

    return `${kmlHeader}${placemarks.join('')}${kmlFooter}`;
  };

  const downloadKml = (layer) => {
    const kmlContent = generateKmlFromLayer(layer);
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layer.name.replace(/[^a-z0-9]/gi, '_')}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = [latitude, longitude];
        setUserLocation(newLocation);
        setFoundMarker(newLocation);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Izin lokasi ditolak.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Informasi lokasi tidak tersedia.');
            break;
          case error.TIMEOUT:
            setGeoError('Permintaan lokasi habis waktu.');
            break;
          default:
            setGeoError('Terjadi kesalahan saat mendapatkan lokasi.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Toggle Sidebar Button */}
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
        <div className="map-sidebar" style={{
          position: 'absolute',
          top: 60,
          left: 20,
          width: 320,
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          padding: 12,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 8,
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 1000
        }}>
          <h5>🔍 Cari Lokasi</h5>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              setLocationQuery(inputLocation.trim());
            }}
            className="mb-3"
          >
            <Form.Control
              type="text"
              placeholder="Cari lokasi..."
              value={inputLocation}
              onChange={(e) => setInputLocation(e.target.value)}
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

          <h5>Layers KML/KMZ</h5>
          <Button size="sm" onClick={addLayer} className="mb-3 w-100">
            Tambah Layer
          </Button>
          <Form.Control
            placeholder="🔍 Filter nama layer..."
            value={layerFilter}
            onChange={(e) => setLayerFilter(e.target.value)}
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
                    onChange={(e) => {
                      const newName = e.target.value;
                      setLayers(prev => {
                        const newLayers = [...prev];
                        newLayers[idx].name = newName;
                        return newLayers;
                      });
                    }}
                    className="mt-1 mb-1"
                    placeholder="Nama layer"
                  />
                  <Form.Control
                    type="color"
                    value={layer.color}
                    title="Pilih warna layer"
                    onChange={(e) => updateColor(idx, e.target.value)}
                    className="mb-1"
                  />
                  <Form.Control
                    type="file"
                    accept=".kml,.kmz"
                    onChange={(e) => handleFileChange(e, idx)}
                    className="mb-1"
                    ref={el => fileInputRefs.current[idx] = el}
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
        center={defaultLocation}
        zoom={15}
        maxZoom={20}
        scrollWheelZoom={true}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={25}
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />
        <FlyToLocation location={userLocation} />

        {/* Marker hasil pencarian */}
        {foundMarker && (
          <Marker position={foundMarker}>
            <Popup>Lokasi yang dicari</Popup>
          </Marker>
        )}

        {/* Marker lokasi user */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}
          >
            <Popup>Lokasi Anda saat ini</Popup>
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
                  <Popup>{marker.label || `Marker ${mIdx + 1}`}</Popup>
                </Marker>
              ))}

              {/* Polyline di layer */}
              {layer.polylines.map((polyline, pIdx) => (
                <Polyline
                  key={`polyline-${idx}-${pIdx}`}
                  positions={polyline.positions}
                  pathOptions={{ color: layer.color, weight: 5 }}
                >
                  <Popup>{polyline.label || `Polyline ${pIdx + 1}`}</Popup>
                </Polyline>
              ))}
            </LayerGroup>
          )
        ))}

        <SearchLocationHandler query={locationQuery} onFound={setFoundMarker} />
      </MapContainer>
    </div>
  );
}

export default Maps;