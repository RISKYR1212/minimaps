import React, { useState, useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Form } from 'react-bootstrap';
import * as toGeoJSON from '@tmcw/togeojson';
import JSZip from 'jszip';

// Fix leaflet icon
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

function Maps() {
  const defaultLocation = [-6.511809, 106.8128];
  const [foundMarker, setFoundMarker] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [layers, setLayers] = useState([]);
  const [zoomToLayer, setZoomToLayer] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);
  const [loading, setLoading] = useState(false);

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
    localStorage.setItem('map_layers', JSON.stringify(simplifiedLayers));
  }, [layers]);

  const fetchFileList = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/files');
      const files = await res.json();
      setDriveFiles(files);
    } catch (err) {
      console.error('Gagal ambil daftar file dari backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFileById = async (fileId, fileName) => {
    try {
      const res = await fetch(`http://localhost:5000/download/${fileId}`);
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

    const isSplittable = /tiang|odp/i.test(name);
    const chunkSize = 1000;

    if (isSplittable && markers.length > chunkSize) {
      for (let i = 0; i < markers.length; i += chunkSize) {
        const chunk = markers.slice(i, i + chunkSize);
        const chunkName = `${name} (${i / chunkSize + 1})`;
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        setLayers(prev => [...prev, {
          name: chunkName,
          visible: false,
          color,
          markers: chunk,
          polylines: i === 0 ? polylines : []
        }]);
      }
    } else {
      const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      setLayers(prev => [...prev, { name, visible: false, color, markers, polylines }]);
    }
  };

  const handleExport = (format, layer) => {
    const geojson = {
      type: 'FeatureCollection',
      features: []
    };

    layer.markers.forEach(({ lat, lng, label }) => {
      geojson.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { name: label }
      });
    });

    layer.polylines.forEach(({ positions, label }) => {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: positions.map(([lat, lng]) => [lng, lat])
        },
        properties: { name: label }
      });
    });

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${layer.name}.${format}.geojson`;
    link.click();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Button size="sm" variant="primary" onClick={() => setSidebarVisible(!sidebarVisible)} style={{ position: 'absolute', top: 12, left: 12, zIndex: 1200 }}>
        {sidebarVisible ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
      </Button>

      <Button size="sm" variant="info" onClick={fetchFileList} style={{ position: 'absolute', top: 12, left: 180, zIndex: 1200 }}>
        Lihat File dari Drive
      </Button>

      {loading && (
        <div style={{ position: 'absolute', top: 60, left: 12, background: '#fff', padding: 10, border: '1px solid #ccc', zIndex: 1300 }}>
          Memuat daftar file dari Google Drive...
        </div>
      )}

      {sidebarVisible && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: 320, height: '100%', background: '#f8f9fa', zIndex: 1100, overflowY: 'auto', padding: 12 }}>
          <h5>Daftar Layer</h5>

          {driveFiles.map((file) => (
            <div key={file.id} style={{ marginBottom: 8 }}>
              <div className="d-flex justify-content-between align-items-center">
                <span>{file.name}</span>
                <Button size="sm" onClick={() => loadFileById(file.id, file.name)}>Muat</Button>
              </div>
            </div>
          ))}

          <hr />
          {layers.map((layer, i) => (
            <div key={layer.name + i} style={{ marginBottom: 12, borderBottom: '1px solid #ccc', paddingBottom: 8 }}>
              <Form.Check
                type="checkbox"
                checked={layer.visible}
                label={layer.name}
                onChange={() => {
                  setLayers(prev =>
                    prev.map((l, idx) => idx === i ? { ...l, visible: !l.visible } : l)
                  );
                }}
              />
              <div className="d-flex align-items-center mt-1">
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => {
                    setLayers(prev =>
                      prev.map((l, idx) => idx === i ? { ...l, color: e.target.value } : l)
                    );
                  }}
                />
                <Button size="sm" variant="outline-secondary" className="ms-2" onClick={() => setZoomToLayer(i)}>Zoom</Button>
                <Button size="sm" variant="outline-success" className="ms-2" onClick={() => handleExport('layer', layer)}>Export</Button>
              </div>
              <small className="text-muted">{layer.markers.length} titik, {layer.polylines.length} garis</small>
            </div>
          ))}
        </div>
      )}

      <MapContainer
        center={defaultLocation}
        zoom={14}
        scrollWheelZoom
        style={{ height: '100vh', width: '100%', marginLeft: sidebarVisible ? 320 : 0, transition: 'margin-left 0.3s' }}
      >
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <FlyToLocation location={
          zoomToLayer !== null
            ? (layers[zoomToLayer]?.markers[0] || layers[zoomToLayer]?.polylines[0]?.positions[0])
            : foundMarker || userLocation
        } />

        {layers.map((layer, i) => layer.visible && (
          <LayerGroup key={layer.name + i}>
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
        ))}
      </MapContainer>
    </div>
  );
}

export default Maps;
