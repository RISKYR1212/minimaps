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

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location, 18, { duration: 1, easeLinearity: 0.25 });
    }
  }, [location, map]);
  return null;
}

function SearchLocationHandler({ query, onFound }) {
  const map = useMap();
  useEffect(() => {
    const fetchLocation = async () => {
      if (!query) return;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
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

const encodeLayers = (layers) => {
  const simplified = layers.map(layer => ({ n: layer.name, v: layer.visible, c: layer.color, m: layer.markers, p: layer.polylines }));
  return encodeURIComponent(JSON.stringify(simplified));
};

const decodeLayers = (encoded) => {
  try {
    const decoded = JSON.parse(decodeURIComponent(encoded));
    return decoded.map(layer => ({ name: layer.n || 'Layer', visible: layer.v !== undefined ? layer.v : true, color: layer.c || '#ff0000', markers: layer.m || [], polylines: layer.p || [] }));
  } catch {
    return [{ name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }];
  }
};

const escapeXml = (str) => {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

function Maps() {
  const defaultLocation = [-6.511809, 106.8128];
  const [inputLocation, setInputLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [foundMarker, setFoundMarker] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false); // default: false di mobile, true di desktop via effect
  const [layerFilter, setLayerFilter] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const fileInputRefs = useRef([]);
  const [layers, setLayers] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLayers = params.get('layers');
    if (urlLayers) return decodeLayers(urlLayers);
    const saved = localStorage.getItem('layersData');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return [{ name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }]; }
    }
    return [{ name: 'Layer 1', visible: true, markers: [], polylines: [], color: '#ff0000' }];
  });

  // Detect screen size and set default sidebarVisible
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarVisible(true);
      else setSidebarVisible(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const messages = {
          1: 'Izin lokasi ditolak.',
          2: 'Informasi lokasi tidak tersedia.',
          3: 'Permintaan lokasi habis waktu.'
        };
        setGeoError(messages[error.code] || 'Terjadi kesalahan saat mendapatkan lokasi.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Toggle Button */}
      <Button
        size="sm"
        variant="primary"
        onClick={() => setSidebarVisible(!sidebarVisible)}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1200,
          borderRadius: '0.375rem',
          padding: '0.25rem 0.5rem',
          minWidth: '110px',
        }}
        aria-label={sidebarVisible ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
      >
        {sidebarVisible ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
      </Button>

      {/* Sidebar */}
      <div
        className="map-sidebar"
        style={{
          position: window.innerWidth < 768 ? 'fixed' : 'absolute',
          top: 50,
          left: sidebarVisible ? 0 : '-320px',
          width: 320,
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          backgroundColor: '#f8f9fa',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1100,
          transition: 'left 0.3s ease-in-out',
          padding: '1rem',
          fontSize: '0.9rem',
          borderRight: '1px solid #ddd',
        }}
      >
        <h5>Kontrol Peta</h5>

        {/* Cari Lokasi */}
        <Form.Group controlId="searchLocation" className="mb-3">
          <Form.Label>Cari Lokasi</Form.Label>
          <Form.Control
            type="search"
            placeholder="Ketik lokasi..."
            value={inputLocation}
            onChange={e => setInputLocation(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setLocationQuery(inputLocation);
              }
            }}
          />
          <Button
            size="sm"
            className="mt-2"
            onClick={() => setLocationQuery(inputLocation)}
          >
            Cari
          </Button>
        </Form.Group>

        {/* Geolocation */}
        <div className="mb-3">
          <Button variant="outline-success" size="sm" onClick={getCurrentLocation}>
            Cari Lokasi Saya
          </Button>
          {geoError && <Alert variant="danger" className="mt-2 p-1">{geoError}</Alert>}
        </div>

        {/* Filter Layer */}
        <Form.Group controlId="filterLayers" className="mb-3">
          <Form.Label>Filter Layer (Nama)</Form.Label>
          <Form.Control
            type="text"
            placeholder="Filter..."
            value={layerFilter}
            onChange={e => setLayerFilter(e.target.value)}
          />
        </Form.Group>

        {/* List Layers */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {layers.filter(l => l.name.toLowerCase().includes(layerFilter.toLowerCase())).map((layer, i) => (
            <Card
              key={i}
              className="mb-2"
              style={{ borderLeft: `4px solid ${layer.color}`, cursor: 'default' }}
            >
              <Card.Body style={{ padding: '0.5rem 1rem' }}>
                <Form.Check
                  type="checkbox"
                  id={`layer-visibility-${i}`}
                  label={layer.name}
                  checked={layer.visible}
                  onChange={e => {
                    const newLayers = [...layers];
                    newLayers[i].visible = e.target.checked;
                    setLayers(newLayers);
                  }}
                />
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Import File */}
        <Form.Group controlId="importFiles" className="mb-3">
          <Form.Label>Impor File KML / KMZ per Layer</Form.Label>
          {layers.map((layer, i) => (
            <Form.Control
              key={`file-input-${i}`}
              type="file"
              accept=".kml,.kmz"
              className="mb-2"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) parseFile(file, i);
                e.target.value = null;
              }}
              aria-label={`Upload file untuk layer ${layer.name}`}
            />
          ))}
        </Form.Group>

        {/* Tambah Layer */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLayers(prev => [...prev, { name: `Layer ${prev.length + 1}`, visible: true, markers: [], polylines: [], color: '#'+Math.floor(Math.random()*16777215).toString(16) }])}
          className="w-100"
        >
          Tambah Layer
        </Button>
      </div>

      {/* Map */}
      <MapContainer
        center={defaultLocation}
        zoom={14}
        scrollWheelZoom={true}
        style={{
          height: '100vh',
          width: '100%',
          marginLeft: window.innerWidth < 768 ? 0 : (sidebarVisible ? 320 : 0),
          transition: 'margin-left 0.3s ease-in-out'
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>Lokasi Saya</Popup>
          </Marker>
        )}

        {/* Marker hasil pencarian */}
        {foundMarker && (
          <Marker position={foundMarker}>
            <Popup>Hasil Pencarian</Popup>
          </Marker>
        )}

        {/* FlyTo */}
        <FlyToLocation location={foundMarker || userLocation} />

        {/* Render Layers */}
        {layers.map((layer, i) => (
          layer.visible && (
            <LayerGroup key={i}>
              {layer.markers.map((marker, idx) => (
                <Marker key={idx} position={[marker.lat, marker.lng]}>
                  <Popup>{marker.label}</Popup>
                </Marker>
              ))}
              {layer.polylines.map((pline, idx) => (
                <Polyline
                  key={idx}
                  positions={pline.positions}
                  color={layer.color}
                  weight={4}
                  opacity={0.8}
                >
                  <Popup>{pline.label}</Popup>
                </Polyline>
              ))}
            </LayerGroup>
          )
        ))}

        {/* Search location handler */}
        <SearchLocationHandler query={locationQuery} onFound={setFoundMarker} />
      </MapContainer>
    </div>
  );
}

export default Maps;
