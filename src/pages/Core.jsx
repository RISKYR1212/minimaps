import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';

// Core fiber optick dengan peta Leaflet
const Core = () => {
  const position = [51.505, -0.09];
  const coreColors = ['blue', 'orange', 'green', 'brown', 'gray', 'white', 'red', 'black', 'yellow', 'purple', 'pink', 'teal'];

  const [markers, setMarkers] = useState([
    { id: 1, position: [51.505, -0.09], color: coreColors[0] },
    { id: 2, position: [51.515, -0.1], color: coreColors[1] },
    { id: 3, position: [51.525, -0.11], color: coreColors[2] },
  ]);

  
  const createIcon = (color) => {
    return new Icon({
      iconUrl: `https://www.google.com/intl/en_ALL/mapfiles/marker.png`, 
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  };

  return (
    <div style={{ height: '100vh' }}>
      <MapContainer center={position} zoom={13} scrollWheelZoom={true} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker key={marker.id} position={marker.position} icon={createIcon(marker.color)}>
            <Popup>
              Marker dengan warna: {marker.color} <br /> Posisi: {marker.position.join(', ')}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default Core;
