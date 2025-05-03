import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, } from "react-leaflet";
import * as XLSX from "xlsx";
import "leaflet/dist/leaflet.css";
import "bootstrap/dist/css/bootstrap.min.css";
// import L from "leaflet";

const defaultCores = [ "blue", "orange", "green", "brown", "gray", "white", "red", "black", "yellow", "purple", "pink", "aqua" ];

const Core = () => {
  const [cableName, setCableName] = useState("");
  const [coreCount, setCoreCount] = useState(12);
  const [cores, setCores] = useState([]);
  const [cableCoords, setCableCoords] = useState([]);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(null); 

  const generateCores = () => {
    const generated = Array.from({ length: coreCount }, (_, i) => ({
      no: i + 1,
      color: defaultCores[i % defaultCores.length],
      status: "free",
    }));
    setCores(generated);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cores);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cores");
    XLSX.writeFile(wb, `${cableName || "fiber_cable"}_cores.xlsx`);
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const newCoord = [e.latlng.lat, e.latlng.lng];
        setCableCoords((prev) => [...prev, newCoord]);
      },
    });
    return null;
  };

  
  const deleteSelectedMarker = () => {
    if (selectedMarkerIndex !== null) {
      const updatedCoords = cableCoords.filter((_, index) => index !== selectedMarkerIndex);
      setCableCoords(updatedCoords);
      setSelectedMarkerIndex(null); 
    }
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
  }, [cableCoords, selectedMarkerIndex]);

  const onMarkerClick = (index) => {
    setSelectedMarkerIndex(index); 
  };

  const onMarkerDragEnd = (index, e) => {
    const newCoords = [...cableCoords];
    newCoords[index] = [e.target.getLatLng().lat, e.target.getLatLng().lng];
    setCableCoords(newCoords);
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
     {/* ADD MAPS */}
      <MapContainer
        center={[-6.205, 106.805]}
        zoom={16}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler />

        {/* ADDPOLILANE */}
        {cableCoords.length > 1 && (
          <Polyline positions={cableCoords} color="red" />
        )}

        {/* MARKER */}
        {cableCoords.map((coord, index) => (
          <Marker
            key={index}
            position={coord}
            draggable={true}
            eventHandlers={{
              click: () => onMarkerClick(index), 
              dragend: (e) => onMarkerDragEnd(index, e),            }}
          >
            <Popup>{`Titik ${index + 1}`}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* SIDEBAR BOOSTRAP */}
      <div
        className="card p-3 shadow"
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "300px",
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
            value={coreCount}
            onChange={(e) => setCoreCount(parseInt(e.target.value))}
          />
        </div>

        <div className="d-grid gap-2 mb-3">
          <button className="btn btn-primary" onClick={generateCores}>
            Generate Core
          </button>
          <button className="btn btn-success" onClick={exportToExcel}>
            Export ke Excel
          </button>
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

        {cableCoords.length > 0 && (
          <div>
            <h6>Koordinat Jalur Kabel</h6>
            <ul className="list-group list-group-flush small">
              {cableCoords.map((coord, i) => (
                <li key={i} className="list-group-item">
                  {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div> 
  );
};

export default Core;
