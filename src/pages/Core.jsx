import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';

const coreColors = [ 'blue', 'orange', 'green', 'brown', 'grey', 'white','black', 'yellow', 'red', 'purple', 'pink', 'teal' ];

const createIcon = (color) =>
  new divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border: 2px solid black;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const DirectionArrows = ({ path }) => {
  const map = useMap();

  return path.slice(0, -1).map((point, idx) => {
    const nextPoint = path[idx + 1];
    const midLat = (point[0] + nextPoint[0]) / 2;
    const midLng = (point[1] + nextPoint[1]) / 2;
    const angle = Math.atan2(nextPoint[1] - point[1], nextPoint[0] - point[0]) * 180 / Math.PI;

    return (
      <Marker
        key={`arrow-${idx}`}
        position={[midLat, midLng]}
        icon={divIcon({
          className: 'arrow-icon',
          html: `<div style="transform: rotate(${angle}deg); font-size: 18px;">➤</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })}
      />
    );
  });
};

const Core = () => {
  const nodeA = [ -6.480318,106.861833 ];
  const joinClosure = [ -6.478096,106.863576 ];
  const nodeB = [ -6.477117,106.863621 ];
  const nodeC = [ -6.476185,106.865361 ];
  const nodeD = [ -6.475667,106.865893 ];

  const cablePaths = [
    [nodeA, joinClosure, nodeB],
    [nodeA, joinClosure, nodeC],
    [nodeD, joinClosure, nodeB],
    [nodeD, joinClosure, nodeC]
  ];

  const pathColors = ['green', 'blue', 'green', 'green'];

  const [coreCounts, setCoreCounts] = useState([6, 4, 4, 4]);
  const [splices, setSplices] = useState([
    Array.from({ length: 6 }, (_, i) => ({ from: `A${i + 1}`, to: `B${i + 1}` })),
    Array.from({ length: 4 }, (_, i) => ({ from: `A${i + 1}`, to: `C${i + 1}` })),
    Array.from({ length: 4 }, (_, i) => ({ from: `D${i + 1}`, to: `B${i + 1}` })),
    Array.from({ length: 4 }, (_, i) => ({ from: `D${i + 1}`, to: `C${i + 1}` }))
  ]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const addNotification = (message) => {
    setNotifications(prev => [...prev, { id: Date.now(), message }]);
  };

  const handleSpliceChange = (pathIndex, coreIndex, side, value) => {
    const updated = [...splices];
    updated[pathIndex] = [...updated[pathIndex]];
    updated[pathIndex][coreIndex] = {
      ...updated[pathIndex][coreIndex],
      [side]: value,
    };
    setSplices(updated);
    addNotification(`Splice di Path ${pathIndex + 1} diubah (Core ${coreIndex + 1})`);
  };

  const handleCoreCountChange = (pathIndex, e) => {
    const count = parseInt(e.target.value, 10);
    if (!isNaN(count) && count > 0) {
      const newCoreCounts = [...coreCounts];
      newCoreCounts[pathIndex] = count;
      setCoreCounts(newCoreCounts);

      const newSplices = [...splices];
      newSplices[pathIndex] = Array.from({ length: count }, (_, i) => {
        const existing = splices[pathIndex]?.[i] || {};
        return {
          from: existing.from || `${String.fromCharCode(65 + pathIndex)}${i + 1}`,
          to: existing.to || `${String.fromCharCode(66 + pathIndex)}${i + 1}`
        };
      });
      setSplices(newSplices);
      addNotification(`Jumlah core Path ${pathIndex + 1} diubah menjadi ${count}`);
    }
  };

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <MapContainer center={joinClosure} zoom={18} scrollWheelZoom={true} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {cablePaths.map((path, idx) => (
          <Polyline 
            key={`path-${idx}`} 
            positions={path} 
            color={pathColors[idx]} 
            weight={4} 
          />
        ))}

        {cablePaths.map((path, idx) => (
          <DirectionArrows key={`arrows-${idx}`} path={path} />
        ))}

        <Marker position={nodeA} icon={createIcon('blue')}>
          <Popup>
            <strong>Node A</strong><br />
            Posisi: {nodeA.join(', ')}
          </Popup>
        </Marker>

        <Marker position={nodeD} icon={createIcon('green')}>
          <Popup>
            <strong>Node D</strong><br />
            Posisi: {nodeD.join(', ')}
          </Popup>
        </Marker>

        <Marker position={joinClosure} icon={createIcon('purple')}>
          <Popup minWidth={400}>
            <div>
              <strong>Join Closure (Belokan)</strong><br />
              Posisi: {joinClosure.join(', ')}<br />
              <hr />
              <div style={{ display: 'flex', marginBottom: '10px' }}>
                {cablePaths.map((_, idx) => (
                  <button 
                    key={`tab-${idx}`}
                    style={{
                      padding: '5px 10px',
                      marginRight: '5px',
                      backgroundColor: pathColors[idx],
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px 4px 0 0',
                      cursor: 'pointer'
                    }}
                  >
                    Path {idx + 1}
                  </button>
                ))}
              </div>

              {cablePaths.map((path, pathIndex) => (
                <div key={`path-management-${pathIndex}`}>
                  <h4 style={{ color: pathColors[pathIndex] }}>
                    Path {pathIndex + 1} ({path[0][0].toFixed(3)},{path[0][1].toFixed(3)} → {path[path.length-1][0].toFixed(3)},{path[path.length-1][1].toFixed(3)})
                  </h4>
                  <label>Jumlah Core: </label>
                  <input
                    type="number"
                    value={coreCounts[pathIndex]}
                    onChange={(e) => handleCoreCountChange(pathIndex, e)}
                    min={1}
                    style={{ width: '60px', marginBottom: '8px' }}
                  />

                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '15px' }}>
                    {Array.from({ length: coreCounts[pathIndex] }).map((_, coreIdx) => (
                      <div key={coreIdx} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: coreColors[coreIdx % coreColors.length],
                            borderRadius: '50%',
                            border: '1px solid black',
                            marginRight: '6px',
                          }}
                        />
                        <input
                          type="text"
                          placeholder={`${String.fromCharCode(65 + pathIndex)}${coreIdx + 1}`}
                          value={splices[pathIndex]?.[coreIdx]?.from || ''}
                          onChange={(e) => handleSpliceChange(pathIndex, coreIdx, 'from', e.target.value)}
                          style={{ width: '60px', marginRight: '5px' }}
                        />
                        →
                        <input
                          type="text"
                          placeholder={`${String.fromCharCode(66 + pathIndex)}${coreIdx + 1}`}
                          value={splices[pathIndex]?.[coreIdx]?.to || ''}
                          onChange={(e) => handleSpliceChange(pathIndex, coreIdx, 'to', e.target.value)}
                          style={{ width: '60px', marginLeft: '5px' }}
                        />
                      </div>
                    ))}
                  </div>

                  <strong>Splice Summary:</strong>
                  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {splices[pathIndex]?.map((splice, coreIdx) => (
                      <li key={coreIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: coreColors[coreIdx % coreColors.length],
                            borderRadius: '50%',
                            marginRight: '8px',
                            border: '1px solid #000',
                          }}
                        />
                        <span style={{ color: coreColors[coreIdx % coreColors.length] }}>
                          {splice.from} → {splice.to}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <hr />
                </div>
              ))}
            </div>
          </Popup>
        </Marker>

        <Marker position={nodeB} icon={createIcon('green')}>
          <Popup>
            <strong>Node B</strong><br />
            Posisi: {nodeB.join(', ')}
          </Popup>
        </Marker>

        <Marker position={nodeC} icon={createIcon('green')}>
          <Popup>
            <strong>Node C</strong><br />
            Posisi: {nodeC.join(', ')}
          </Popup>
        </Marker>
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 0 5px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        zIndex: 9999
      }} onClick={() => setShowNotifPanel(!showNotifPanel)}>
        🔔
        {notifications.length > 0 && (
          <span style={{
            background: 'red',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            marginLeft: '6px',
            fontSize: '12px'
          }}>{notifications.length}</span>
        )}
      </div>

      {showNotifPanel && (
        <div style={{
          position: 'absolute',
          top: 50,
          right: 10,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '10px',
          maxWidth: '250px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 9999
        }}>
          <strong>Notifikasi Perubahan</strong>
          <ul style={{ paddingLeft: '20px' }}>
            {notifications.map((notif) => (
              <li key={notif.id}>{notif.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Core;
