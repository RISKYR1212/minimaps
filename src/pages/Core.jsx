import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, } from "react-leaflet";
import * as XLSX from "xlsx";
import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";

const defaultCores = [
  "blue", "orange", "green", "brown", "gray", "white",
  "red", "black", "yellow", "purple", "pink", "aqua"
];

const defaultColors = [
  "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#FFA500", "#800080", "#008000", "#000080", "#800000", "#008080"
];

const Core = () => {
  const [cableName, setCableName] = useState("");
  const [coreCount, setCoreCount] = useState();
  const [cores, setCores] = useState([]);
  const [polylines, setPolylines] = useState([
    { id: 1, name: "Polyline 1", color: defaultColors[0], coords: [] }
  ]);
  const [activePolylineId, setActivePolylineId] = useState(1);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [nextPolylineId, setNextPolylineId] = useState(2);

  const generateCores = () => {
    const count = parseInt(coreCount);
    if (!count || count <= 0) return;
    const generated = Array.from({ length: count }, (_, i) => ({
      no: i + 1,
      color: defaultCores[i % defaultCores.length],
      status: "",
    }));
    setCores(generated);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cores);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cores");
    XLSX.writeFile(wb, `${cableName || "fiber_cable"}_cores.xlsx`);
  };

  const exportAsplanToKML = () => {
    const filename = prompt("Masukkan nama file KML:", cableName || "asplan");
    if (!filename) return;

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${filename}</name>
    ${polylines.map(polyline => {
      const hasLine = polyline.coords.length > 1;
      const hasPoints = polyline.coords.length > 0;
      
      if (!hasLine && !hasPoints) return '';
      
      return `
    <Folder>
      <name>${polyline.name}</name>
      <open>1</open>
      ${hasLine ? `
      <Placemark>
        <name>${polyline.name} - Line</name>
        <Style>
          <LineStyle>
            <color>${polyline.color.replace("#", "ff")}</color>
            <width>4</width>
          </LineStyle>
        </Style>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>
            ${polyline.coords.map(coord => `${coord.lng},${coord.lat},0`).join(" ")}
          </coordinates>
        </LineString>
      </Placemark>` : ''}
      ${hasPoints ? polyline.coords.map((coord, index) => `
      <Placemark>
        <name>${coord.name || `${polyline.name} - Titik ${index + 1}`}</name>
        <Style>
          <IconStyle>
            <color>${polyline.color.replace("#", "ff")}</color>
            <scale>1.2</scale>
            <Icon>
              <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
            </Icon>
          </IconStyle>
        </Style>
        <Point>
          <coordinates>${coord.lng},${coord.lat},0</coordinates>
        </Point>
      </Placemark>`).join("\n") : ''}
    </Folder>`;
    }).join("\n")}
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.kml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const activePolyline = polylines.find(p => p.id === activePolylineId);
        if (!activePolyline) return;

        const newCoord = {
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          name: `Titik ${activePolyline.coords.length + 1}`,
        };

        setPolylines(prev => prev.map(polyline => 
          polyline.id === activePolylineId
            ? { ...polyline, coords: [...polyline.coords, newCoord] }
            : polyline
        ));
      },
    });
    return null;
  };

  const deleteSelectedMarker = () => {
    if (!selectedMarker) return;

    setPolylines(prev => prev.map(polyline => 
      polyline.id === selectedMarker.polylineId
        ? { 
            ...polyline, 
            coords: polyline.coords.filter((_, i) => i !== selectedMarker.index) 
          }
        : polyline
    ));
    setSelectedMarker(null);
  };

  useEffect(() => {
    const handleBackspaceKey = (event) => {
      if (event.key === "Backspace") {
        deleteSelectedMarker();
      }
    };
    window.addEventListener("keydown", handleBackspaceKey);
    return () => {
      window.removeEventListener("keydown", handleBackspaceKey);
    };
  }, [selectedMarker]);

  const onMarkerClick = (index, polylineId) => {
    setSelectedMarker({ index, polylineId });
  };

  const onMarkerDragEnd = (index, polylineId, e) => {
    setPolylines(prev => prev.map(polyline => 
      polyline.id === polylineId
        ? {
            ...polyline,
            coords: polyline.coords.map((coord, i) => 
              i === index
                ? { ...coord, lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }
                : coord
            )
          }
        : polyline
    ));
  };

  const handleNameChange = (index, polylineId, newName) => {
    setPolylines(prev => prev.map(polyline => 
      polyline.id === polylineId
        ? {
            ...polyline,
            coords: polyline.coords.map((coord, i) => 
              i === index ? { ...coord, name: newName } : coord
            )
          }
        : polyline
    ));
  };

  const addNewPolyline = () => {
    const newId = nextPolylineId;
    const newColor = defaultColors[(newId - 1) % defaultColors.length];
    const newPolyline = {
      id: newId,
      name: `Polyline ${newId}`,
      color: newColor,
      coords: []
    };
    setPolylines([...polylines, newPolyline]);
    setActivePolylineId(newId);
    setNextPolylineId(newId + 1);
  };

  const removePolyline = (id) => {
    if (polylines.length <= 1) {
      alert("Setidaknya harus ada satu polyline");
      return;
    }
    setPolylines(polylines.filter(p => p.id !== id));
    if (activePolylineId === id) {
      setActivePolylineId(polylines[0].id);
    }
    if (selectedMarker?.polylineId === id) {
      setSelectedMarker(null);
    }
  };

  const updatePolylineName = (id, newName) => {
    setPolylines(prev => prev.map(polyline => 
      polyline.id === id ? { ...polyline, name: newName } : polyline
    ));
  };

  const updatePolylineColor = (id, newColor) => {
    setPolylines(prev => prev.map(polyline => 
      polyline.id === id ? { ...polyline, color: newColor } : polyline
    ));
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
      <MapContainer
        center={[-6.205, 106.805]}
        zoom={18}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={25}
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />
        <MapClickHandler />
        
        {polylines.map(polyline => (
          <React.Fragment key={polyline.id}>
            {polyline.coords.length > 1 && (
              <Polyline 
                positions={polyline.coords.map(c => [c.lat, c.lng])} 
                color={polyline.color}
                pathOptions={{ color: polyline.color }}
              />
            )}
            {polyline.coords.map((coord, index) => (
              <Marker
                key={`${polyline.id}-${index}`}
                position={[coord.lat, coord.lng]}
                draggable={true}
                eventHandlers={{
                  click: () => onMarkerClick(index, polyline.id),
                  dragend: (e) => onMarkerDragEnd(index, polyline.id, e),
                }}
              >
                <Popup>
                  <div>
                    <strong>{polyline.name}</strong><br />
                    {coord.name}<br />
                    {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </React.Fragment>
        ))}
      </MapContainer>

      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="btn btn-secondary"
        style={{
          position: "absolute",
          top: "10px",
          left: showSidebar ? "350px" : "10px",
          zIndex: 1001,
        }}
      >
        {showSidebar ? "Sembunyikan" : "Tampilkan"} Sidebar
      </button>

      {showSidebar && (
        <div
          className="card p-3 shadow"
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            width: "330px",
            zIndex: 1000,
            backgroundColor: "white",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <h5 className="card-title">Input Kabel & Core</h5>
          <div className="mb-3">
            <label className="form-label">Nama Kabel</label>
            <input
              type="text"
              className="form-control"
              value={cableName}
              onChange={(e) => setCableName(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Jumlah Core</label>
            <input
              type="number"
              className="form-control"
              value={coreCount || ""}
              onChange={(e) => setCoreCount(e.target.value)}
            />
          </div>
          
          <div className="d-flex gap-2 mb-3">
            <button className="btn btn-primary flex-grow-1" onClick={generateCores}>
              Generate Core
            </button>
            <button className="btn btn-success flex-grow-1" onClick={exportToExcel}>
              Export Excel
            </button>
          </div>
          
          <div className="d-grid mb-3">
            <button className="btn btn-warning" onClick={exportAsplanToKML}>
              Export Asplan (KML)
            </button>
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Daftar Polyline</h6>
              <button 
                className="btn btn-sm btn-success"
                onClick={addNewPolyline}
              >
                + Tambah
              </button>
            </div>
            <div className="list-group">
              {polylines.map(polyline => (
                <div 
                  key={polyline.id}
                  className={`list-group-item list-group-item-action ${activePolylineId === polyline.id ? 'active' : ''}`}
                  onClick={() => setActivePolylineId(polyline.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <div 
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: polyline.color,
                          marginRight: "8px",
                          border: "1px solid #ccc"
                        }}
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm bg-transparent border-0 p-0"
                        value={polyline.name}
                        onChange={(e) => updatePolylineName(polyline.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: activePolylineId === polyline.id ? 'white' : 'inherit' }}
                      />
                    </div>
                    <div>
                      <input
                        type="color"
                        value={polyline.color}
                        onChange={(e) => updatePolylineColor(polyline.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="form-control form-control-color"
                        style={{ width: "24px", height: "24px" }}
                      />
                      {polylines.length > 1 && (
                        <button 
                          className="btn btn-sm btn-danger ms-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePolyline(polyline.id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cores.length > 0 && (
            <div className="mb-3">
              <h6>Daftar Core</h6>
              <ul className="list-group">
                {cores.map((core) => (
                  <li key={core.no} className="list-group-item d-flex align-items-center">
                    <span
                      style={{
                        backgroundColor: core.color,
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        display: "inline-block",
                        marginRight: "8px",
                      }}
                    ></span>
                    Core {core.no} - {core.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="accordion" id="coordsAccordion">
            {polylines.map((polyline, idx) => (
              <div className="accordion-item" key={polyline.id}>
                <h2 className="accordion-header">
                  <button 
                    className={`accordion-button ${activePolylineId === polyline.id ? '' : 'collapsed'}`}
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target={`#collapse-${polyline.id}`}
                    onClick={() => setActivePolylineId(polyline.id)}
                  >
                    <div 
                      style={{
                        width: "16px",
                        height: "16px",
                        backgroundColor: polyline.color,
                        marginRight: "8px",
                      }}
                    />
                    {polyline.name}
                  </button>
                </h2>
                <div 
                  id={`collapse-${polyline.id}`} 
                  className={`accordion-collapse collapse ${activePolylineId === polyline.id ? 'show' : ''}`}
                >
                  <div className="accordion-body p-0">
                    <ul className="list-group list-group-flush small">
                      {polyline.coords.map((coord, i) => (
                        <li 
                          key={`${polyline.id}-${i}`} 
                          className={`list-group-item ${selectedMarker?.polylineId === polyline.id && selectedMarker?.index === i ? 'bg-light' : ''}`}
                        >
                          <strong>
                            {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
                          </strong>
                          <input
                            type="text"
                            className="form-control form-control-sm mt-1"
                            value={coord.name}
                            onChange={(e) => handleNameChange(i, polyline.id, e.target.value)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Core;