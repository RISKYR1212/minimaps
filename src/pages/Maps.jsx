import React, { useState, useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Form, InputGroup, FormControl } from 'react-bootstrap';
import * as toGeoJSON from '@tmcw/togeojson';
import JSZip from 'jszip';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo(location, 18, { duration: 1 });
  }, [location, map]);
  return null;
}

async function generateRouteFromORS(start, end) {
  const body = {
    coordinates: [[start[1], start[0]], [end[1], end[0]]],
    format: "geojson"
  };

  try {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': import.meta.env.VITE_ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch (error) {
    console.error('Gagal mengambil rute dari ORS:', error);
    return null;
  }
}

function Maps() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const defaultLocation = [-6.511809, 106.8128];
  const [foundMarker, setFoundMarker] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [layers, setLayers] = useState([]);
  const [zoomToLayer, setZoomToLayer] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [routeLine, setRouteLine] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!BACKEND_URL) {
      console.error('BACKEND_URL tidak terdefinisi!');
      return;
    }

    fetch(`${BACKEND_URL}/files`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data.files) ? data.files : []);
        console.log('List file:', list);
        setDriveFiles(list);
      })

      .catch((err) => console.error('Gagal fetch:', err.message));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('map_layers');
    if (saved) setLayers(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const simplifiedLayers = layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      type: layer.type,
    }));
    try {
      localStorage.setItem('map_layers', JSON.stringify(simplifiedLayers));
    } catch (error) {
      console.warn('Gagal menyimpan ke localStorage:', error);
      localStorage.removeItem('map_layers');
    }
  }, [layers]);

  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const newLoc = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(newLoc);
          if (navigationTarget) {
            const route = await generateRouteFromORS(newLoc, navigationTarget);
            if (route) setRouteLine(route);
          }
        },
        (err) => console.error("Gagal mendapatkan lokasi:", err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [navigationTarget]);

  const fetchFileList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/files`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setDriveFiles(data);
      } else if (data.files && Array.isArray(data.files)) {
        setDriveFiles(data.files);
      } else {
        console.error("Respon tidak sesuai format:", data);
        setDriveFiles([]);
      }
    } catch (err) {
      console.error('Gagal ambil daftar file dari backend:', err);
      setDriveFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFileById = async (fileId, fileName) => {
    try {
      const res = await fetch(`${BACKEND_URL}/download/${fileId}`);
      if (!res.ok) throw new Error(`Gagal fetch file ID: ${fileId}`);
      const blob = await res.blob();
      const fileObj = new File([blob], fileName, { type: blob.type });
      await parseFile(fileObj);
    } catch (err) {
      console.error(`Gagal muat file ${fileId}:`, err);
    }
  };

  const parseFile = async (file) => {
    try {
      let content = '';
      if (file.name.toLowerCase().endsWith('.kmz')) {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const kmlEntry = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
        if (!kmlEntry) throw new Error('KMZ tidak mengandung .kml');
        content = await zip.file(kmlEntry).async('text');
      } else {
        content = await file.text();
      }

      const kmlDom = new DOMParser().parseFromString(content, 'text/xml');
      const geojson = toGeoJSON.kml(kmlDom);
      updateLayer(geojson, file.name.replace(/\.(kml|kmz)$/i, ''));
    } catch (err) {
      console.error(`Gagal parsing file ${file.name}:`, err);
    }
  };

  const updateLayer = (geojson, name) => {
    const markers = [], polylines = [];

    geojson.features?.forEach((feature, i) => {
      if (!feature.geometry) return;
      const label = feature.properties?.name || `${feature.geometry.type} ${i + 1}`;
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        markers.push({ lat, lng, label });
      } else if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        polylines.push({ positions: coords, label });
      }
    });

    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setLayers(prev => [...prev, {
      name,
      visible: true,
      color,
      markers: markers || [],
      polylines: polylines || []
    }]);
  };

  const handleSearch = () => {
    if (!searchTerm) return;
    const lowerSearch = searchTerm.toLowerCase();
    for (const layer of layers) {
      for (const marker of layer.markers || []) {
        if (marker.label.toLowerCase().includes(lowerSearch)) {
          setFoundMarker([marker.lat, marker.lng]);
          return;
        }
      }
      for (const line of layer.polylines || []) {
        if (line.label.toLowerCase().includes(lowerSearch)) {
          if (line.positions.length > 0) {
            setFoundMarker(line.positions[0]);
            return;
          }
        }
      }
    }

    const coordMatch = searchTerm.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      setFoundMarker([lat, lng]);
      return;
    }

    alert("Tidak ditemukan marker atau lokasi yang cocok.");
  };

  const updateLayerColor = (index, newColor) => {
    setLayers(prev => prev.map((l, i) => i === index ? { ...l, color: newColor } : l));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* UI Pencarian */}
      <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 1500, background: '#fff', padding: 8, borderRadius: 6 }}>
        <InputGroup size="sm">
          <FormControl
            placeholder="Cari marker, polyline, atau koordinat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline-primary" onClick={handleSearch}>Cari</Button>
        </InputGroup>
      </div>

      {/* Sidebar */}
      {sidebarVisible && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: 320, height: '100%', background: '#f8f9fa', zIndex: 1100, overflowY: 'auto', padding: 12 }}>
          <h5>Daftar File</h5>
          {driveFiles.map((file) => (
            <div key={file.id} style={{ marginBottom: 8 }}>
              <div className="d-flex justify-content-between align-items-center">
                <span>{file.name}</span>
                <Button size="sm" onClick={() => loadFileById(file.id, file.name)}>Muat</Button>
              </div>
            </div>
          ))}
          <hr />
          <h5>Layer</h5>
          {layers.map((layer, i) => (
            <div key={layer.name + i} style={{ marginBottom: 12 }}>
              <Form.Check
                type="checkbox"
                checked={layer.visible}
                label={layer.name}
                onChange={() => setLayers(prev =>
                  prev.map((l, idx) => idx === i ? { ...l, visible: !l.visible } : l)
                )}
              />
              <InputGroup className="mt-1">
                <InputGroup.Text>Warna</InputGroup.Text>
                <Form.Control
                  type="color"
                  value={layer.color}
                  onChange={(e) => updateLayerColor(i, e.target.value)}
                />
              </InputGroup>
            </div>
          ))}
        </div>
      )}

      {/* Tombol Kontrol */}
      <Button size="sm" variant="primary" onClick={() => setSidebarVisible(!sidebarVisible)} style={{ position: 'absolute', top: 12, left: 12, zIndex: 1200 }}>
        {sidebarVisible ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
      </Button>
      <Button size="sm" variant="info" onClick={fetchFileList} style={{ position: 'absolute', top: 12, left: 180, zIndex: 1200 }}>
        Lihat File dari Drive
      </Button>
      <Button size="sm" variant="success" onClick={() => {
        if (userLocation) setFoundMarker(userLocation);
        else alert("Lokasi belum tersedia.");
      }} style={{ position: 'absolute', top: 12, left: 320, zIndex: 1200 }}>
        Titik Saya
      </Button>

      {loading && (
        <div style={{ position: 'absolute', top: 100, left: 12, background: '#fff', padding: 10, border: '1px solid #ccc', zIndex: 1300 }}>
          Memuat daftar file dari Google Drive...
        </div>
      )}

      {/* Peta */}
      <MapContainer center={defaultLocation} zoom={14} scrollWheelZoom style={{ height: '100%', width: '100%', marginLeft: sidebarVisible ? 320 : 0 }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyToLocation key={JSON.stringify(foundMarker)} location={foundMarker} />

        {userLocation && (
          <Marker position={userLocation} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61168.png', iconSize: [25, 25] })}>
            <Popup>Lokasi Kamu</Popup>
          </Marker>
        )}

        {routeLine && (
          <Polyline positions={routeLine} color="blue" weight={5} dashArray="5,10" />
        )}

        {layers.map((layer, i) => layer.visible && (
          <LayerGroup key={layer.name + i}>
            {(layer.markers || []).map((marker, idx) => (
              <Marker key={idx} position={[marker.lat, marker.lng]}>
                <Popup>
                  <div>
                    <div>{marker.label}</div>
                    <Button size="sm" variant="primary" className="mt-2" onClick={async () => {
                      const target = [marker.lat, marker.lng];
                      setNavigationTarget(target);
                      if (userLocation) {
                        const route = await generateRouteFromORS(userLocation, target);
                        if (route) setRouteLine(route);
                      }
                    }}>Navigasi</Button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {(layer.polylines || []).map((pline, idx) => (
              <Polyline key={idx} positions={pline.positions} color={layer.color} weight={4} opacity={0.8}>
                <Popup>{pline.label}</Popup>
              </Polyline>
            ))}
          </LayerGroup>
        ))}
      </MapContainer>
    </div>
  );
}

export default Maps;
