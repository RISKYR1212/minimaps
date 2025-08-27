import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.pm/dist/leaflet.pm.css";
import "leaflet-measure/dist/leaflet-measure.css";
import "leaflet.fullscreen/Control.FullScreen.css";
import "leaflet-minimap/dist/Control.MiniMap.min.css";

import "leaflet.pm"; // editing & drawing
import "leaflet-measure"; // measuring
import "leaflet.fullscreen"; // fullscreen
import "leaflet-minimap"; // minimap

// Fix icon default issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icon untuk pin
const customPin = new L.Icon({
  iconUrl: "/custom-pin.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Komponen kontrol tambahan
const MapControls = ({ addAsset }) => {
  const map = useMap();

  useEffect(() => {
    // Fullscreen
    L.control.fullscreen().addTo(map);

    // Measure tool
    new L.Control.Measure({
      position: "topleft",
      primaryLengthUnit: "meters",
      secondaryLengthUnit: "kilometers",
    }).addTo(map);

    // MiniMap
    const miniMapLayer = new L.TileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
    new L.Control.MiniMap(miniMapLayer, {
      toggleDisplay: true,
      minimized: false,
    }).addTo(map);

    // Aktifkan Leaflet.PM
    map.pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawPolyline: true,
      drawPolygon: false,
      editMode: true,
      removalMode: true,
    });

    // Event ketika marker dibuat
    map.on("pm:create", (e) => {
      if (e.shape === "Marker") {
        const { lat, lng } = e.layer.getLatLng();
        const type = prompt("Masukkan tipe aset: ODP / ODC / Tiang / JC");
        if (type) {
          addAsset({ type, lat, lng });
        }
      } else if (e.shape === "Line") {
        const coords = e.layer.getLatLngs();
        const length = L.GeometryUtil.length(coords);
        addAsset({ type: "Kabel", coords, length });
      }
    });
  }, [map, addAsset]);

  return null;
};

const Project = () => {
  const [projectName, setProjectName] = useState("");
  const [assets, setAssets] = useState([]);
  const [polylineCoords] = useState([
    [-6.914744, 107.60981],
    [-6.918, 107.62],
    [-6.92, 107.63],
  ]);

  const addAsset = (asset) => {
    setAssets((prev) => [...prev, asset]);
  };

  const exportCSV = () => {
    const header = "Type,Lat,Lng,Length\n";
    const rows = assets
      .map((a) =>
        a.type === "Kabel"
          ? `${a.type},-, -,${(a.length / 1000).toFixed(2)} km`
          : `${a.type},${a.lat},${a.lng},-`
      )
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "boq.csv";
    a.click();
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "300px",
          background: "#f4f4f4",
          padding: "10px",
          borderRight: "1px solid #ddd",
        }}
      >
        <h3>Project Info</h3>
        <input
          type="text"
          placeholder="Nama Project"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <h4>BoQ</h4>
        <ul>
          {assets.map((a, i) => (
            <li key={i}>
              {a.type}{" "}
              {a.type === "Kabel"
                ? `(${(a.length / 1000).toFixed(2)} km)`
                : `(${a.lat.toFixed(5)}, ${a.lng.toFixed(5)})`}
            </li>
          ))}
        </ul>
        <button onClick={exportCSV}>Export BOQ (CSV)</button>
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[-6.914744, 107.60981]}
          zoom={13}
          style={{ height: "100vh", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          />
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: "purple", weight: 4 }}
          />
          {polylineCoords.map((coord, idx) => (
            <Marker
              key={idx}
              position={coord}
              icon={
                new L.DivIcon({
                  className: "custom-div-icon",
                  html: `<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6],
                })
              }
            />
          ))}
          <MapControls addAsset={addAsset} />
        </MapContainer>
      </div>
    </div>
  );
};

export default Project;
