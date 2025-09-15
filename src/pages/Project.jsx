import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.pm/dist/leaflet.pm.css";
import "leaflet-measure/dist/leaflet-measure.css";
import "leaflet.fullscreen/Control.FullScreen.css";
import "leaflet-minimap/dist/Control.MiniMap.min.css";

import "leaflet.pm"; 
import "leaflet-measure"; 
import "leaflet.fullscreen"; 
import "leaflet-minimap"; 

// Export Excel
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

//  CONFIGURABLE: KATALOG HARGA
const PRICE_CATALOG = {
  
  items: {
    ODP: 750000,          
    ODC: 5500000,
    Tiang: 1200000,
    JC: 450000,           
    
  },
  
  cables: {
    Feeder: 18000,        
    Distribusi: 12000,    
    Drop: 5000,           
    
  },
};

// UTIL
const idr = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Math.round(n || 0)
  );

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

//  MAP CONTROLS 
const MapControls = ({ onAddAsset, onPolylineComplete }) => {
  const map = useMap();
  const mapRef = useRef(null);

  // hitung panjang polyline (meter) secara geodesic
  const calcLengthMeters = (latlngs) => {
    let m = 0;
    for (let i = 1; i < latlngs.length; i++) {
      m += map.distance(latlngs[i - 1], latlngs[i]);
    }
    return m;
  };

  useEffect(() => {
    if (!map) return;
    mapRef.current = map;

    // Fullscreen
    L.control.fullscreen().addTo(map);

    // Measure tool
    new L.Control.Measure({
      position: "topleft",
      primaryLengthUnit: "meters",
      secondaryLengthUnit: "kilometers",
      primaryAreaUnit: "sqmeters",
      secondaryAreaUnit: "hectares",
    }).addTo(map);

    // MiniMap
    const miniMapLayer = new L.TileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
    new L.Control.MiniMap(miniMapLayer, {
      toggleDisplay: true,
      minimized: false,
    }).addTo(map);

    // Leaflet.PM draw controls
    map.pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawPolyline: true,
      drawPolygon: false,
      drawRectangle: false,
      editMode: true,
      removalMode: true,
    });

    // Handle create events
    const onCreate = async (e) => {
      const shape = e.shape || e.layer?.pm?.getShape?.();
      if (!shape) return;

      if (shape === "Marker") {
        const { lat, lng } = e.layer.getLatLng();

        // Pilih tipe aset marker
        const preset = ["ODP", "ODC", "Tiang", "JC", "Custom"];
        const type = window.prompt(
          `Pilih tipe aset (ketik persis):\n${preset.join(" / ")}\n\nDefault: ODP`,
          "ODP"
        )?.trim();

        let finalType = type || "ODP";
        if (!preset.includes(finalType) && finalType !== "Custom") {
          finalType = "Custom";
        }
        if (finalType === "Custom") {
          const custom = window.prompt("Masukkan nama aset custom:", "Perangkat");
          if (custom && custom.trim()) finalType = custom.trim();
          else finalType = "Perangkat";
        }

        // Harga per unit dari katalog (boleh override manual)
        const defaultPrice = PRICE_CATALOG.items[finalType] ?? 0;
        const priceStr = window.prompt(
          `Harga per unit untuk ${finalType} (IDR). Kosongkan untuk pakai katalog (${idr(defaultPrice)}):`,
          defaultPrice ? String(defaultPrice) : ""
        );
        const unitPrice = priceStr ? Number(priceStr) || 0 : defaultPrice;

        onAddAsset({
          id: crypto.randomUUID(),
          kind: "item", 
          type: finalType,
          lat,
          lng,
          qty: 1,
          unit: "unit",
          unitPrice,
          totalPrice: unitPrice, 
        });

        // biarkan layer tetap di map
      } else if (shape === "Line") {
        const latlngs = e.layer.getLatLngs();
        const lengthM = calcLengthMeters(latlngs);

        // Pilih tipe kabel
        const preset = ["Feeder", "Distribusi", "Drop", "Custom"];
        const cableType = window.prompt(
          `Pilih tipe kabel (ketik persis):\n${preset.join(" / ")}\n\nDefault: Distribusi`,
          "Distribusi"
        )?.trim();

        let finalType = cableType || "Distribusi";
        if (!preset.includes(finalType) && finalType !== "Custom") {
          finalType = "Custom";
        }
        if (finalType === "Custom") {
          const custom = window.prompt("Nama kabel custom:", "Kabel FO");
          if (custom && custom.trim()) finalType = custom.trim();
          else finalType = "Kabel FO";
        }

        const defaultPrice = PRICE_CATALOG.cables[finalType] ?? 0;
        const priceStr = window.prompt(
          `Harga per meter untuk ${finalType} (IDR). Kosongkan untuk pakai katalog (${idr(defaultPrice)}):`,
          defaultPrice ? String(defaultPrice) : ""
        );
        const unitPrice = priceStr ? Number(priceStr) || 0 : defaultPrice;

        const lengthRounded = Math.round(lengthM); // meter bulat

        const asset = {
          id: crypto.randomUUID(),
          kind: "cable",
          type: finalType,
          coords: latlngs.map((ll) => [ll.lat, ll.lng]),
          length_m: lengthRounded,
          unit: "meter",
          unitPrice,
          totalPrice: lengthRounded * unitPrice,
        };

        onAddAsset(asset);

        // callback jika ingin simpan layer / id layer
        onPolylineComplete?.(asset, e.layer);
      }
    };

    map.on("pm:create", onCreate);
    return () => {
      map.off("pm:create", onCreate);
    };
  }, [map, onAddAsset, onPolylineComplete]);

  return null;
};

//  MAIN COMPONENT 
const ProjectPlanner = () => {
  const [projectName, setProjectName] = useState("Project Tanpa Nama");
  const [assets, setAssets] = useState([]);

  const addAsset = (asset) => setAssets((prev) => [...prev, asset]);

  const removeAsset = (id) => setAssets((prev) => prev.filter((a) => a.id !== id));

  const updateQtyOrPrice = (id, field, value) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.kind === "item") {
          const qty = field === "qty" ? Number(value) || 0 : a.qty ?? 1;
          const unitPrice = field === "unitPrice" ? Number(value) || 0 : a.unitPrice || 0;
          return { ...a, qty, unitPrice, totalPrice: qty * unitPrice };
        } else {
          const unitPrice = field === "unitPrice" ? Number(value) || 0 : a.unitPrice || 0;
          return { ...a, unitPrice, totalPrice: (a.length_m || 0) * unitPrice };
        }
      })
    );
  };

  // Aggregate BOQ per tipe (item + cable)
  const boq = useMemo(() => {
    const map = new Map();
    for (const a of assets) {
      const key = `${a.kind}:${a.type}:${a.unit}`;
      const rec = map.get(key) || {
        kind: a.kind,
        type: a.type,
        unit: a.unit,
        qty: 0,
        unitPrice: a.unitPrice || 0, 
        totalPrice: 0,
      };
      if (a.kind === "item") {
        rec.qty += a.qty || 0;
        
        const weightOld = rec.qty - (a.qty || 0);
        rec.unitPrice =
          (rec.unitPrice * weightOld + (a.unitPrice || 0) * (a.qty || 0)) /
          Math.max(1, rec.qty);
        rec.totalPrice += a.totalPrice || 0;
      } else {
        // cable -> qty berarti panjang (meter)
        rec.qty += a.length_m || 0;
        const weightOld = rec.qty - (a.length_m || 0);
        rec.unitPrice =
          (rec.unitPrice * weightOld + (a.unitPrice || 0) * (a.length_m || 0)) /
          Math.max(1, rec.qty);
        rec.totalPrice += a.totalPrice || 0;
      }
      map.set(key, rec);
    }
    const arr = Array.from(map.values());
    const grandTotal = arr.reduce((s, r) => s + (r.totalPrice || 0), 0);
    return { rows: arr, grandTotal };
  }, [assets]);

  // Export ke Excel
  const exportExcel = () => {
    const wsSummaryData = [
      ["Project", projectName],
      ["Tanggal Export", new Date().toLocaleString("id-ID")],
      [],
      ["Rangkuman BOQ"],
      ["Jenis", "Tipe", "Qty / Panjang", "Unit", "Harga Satuan (IDR)", "Total (IDR)"],
      ...boq.rows.map((r) => [
        r.kind === "item" ? "Barang" : "Kabel",
        r.type,
        r.qty,
        r.unit,
        Math.round(r.unitPrice),
        Math.round(r.totalPrice),
      ]),
      [],
      ["Grand Total", "", "", "", "", Math.round(boq.grandTotal)],
    ];

    const wsItemsData = [
      ["ID", "Jenis", "Tipe", "Qty/Length(m)", "Unit", "Unit Price", "Total Price", "Lat", "Lng", "Coords (for cable)"],
      ...assets.map((a) => [
        a.id,
        a.kind,
        a.type,
        a.kind === "item" ? a.qty : a.length_m,
        a.unit,
        a.unitPrice,
        a.totalPrice,
        a.kind === "item" ? a.lat : "",
        a.kind === "item" ? a.lng : "",
        a.kind === "cable" ? JSON.stringify(a.coords) : "",
      ]),
    ];

    const wsCatalogData = [
      ["Katalog Barang - Harga per Unit (IDR)"],
      ["Jenis", "Harga"],
      ...Object.entries(PRICE_CATALOG.items).map(([k, v]) => [k, v]),
      [],
      ["Katalog Kabel - Harga per Meter (IDR)"],
      ["Jenis", "Harga/m"],
      ...Object.entries(PRICE_CATALOG.cables).map(([k, v]) => [k, v]),
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);
    const wsItems = XLSX.utils.aoa_to_sheet(wsItemsData);
    const wsCatalog = XLSX.utils.aoa_to_sheet(wsCatalogData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsItems, "Items");
    XLSX.utils.book_append_sheet(wb, wsCatalog, "PriceCatalog");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/octet-stream" });
    saveAs(blob, `boq_${projectName.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div style={{ display: "flex", height: "90vh", width: "400%" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 450,
          background: "#f8fafc",
          padding: 12,
          borderRight: "1px solid #e5e7eb",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "6px 0 12px" }}>Network Planning & BOQ</h3>

        <label style={{ fontWeight: 600, fontSize: 12 }}>Nama Project</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Nama Project"
          style={{
            width: "100%",
            padding: 8,
            margin: "6px 0 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
          }}
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={exportExcel}
            style={{
              flex: 1,
              padding: 10,
              background: "#0ea5e9",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Export BOQ (Excel)
          </button>
        </div>

        <h4 style={{ marginTop: 10 }}>Rangkuman BOQ</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                Jenis
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                Tipe
              </th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                Qty/Pjg
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                Unit
              </th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                Harga
              </th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {boq.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "6px 4px" }}>{r.kind === "item" ? "Barang" : "Kabel"}</td>
                <td style={{ padding: "6px 4px" }}>{r.type}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{r.qty}</td>
                <td style={{ padding: "6px 4px" }}>{r.unit}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{idr(r.unitPrice)}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{idr(r.totalPrice)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ padding: "10px 4px", fontWeight: 700, borderTop: "1px solid #e5e7eb" }}>
                Grand Total
              </td>
              <td style={{ padding: "10px 4px", textAlign: "right", fontWeight: 700, borderTop: "1px solid #e5e7eb" }}>
                {idr(boq.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ marginTop: 16 }}>Detail Aset</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assets.map((a) => (
            <div
              key={a.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 8,
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>
                  {a.kind === "item" ? "Barang" : "Kabel"} — {a.type}
                </strong>
                <button
                  onClick={() => removeAsset(a.id)}
                  style={{
                    border: "none",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: 6,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  Hapus
                </button>
              </div>

              {a.kind === "item" ? (
                <>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                    Posisi: {a.lat?.toFixed(6)}, {a.lng?.toFixed(6)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12 }}>Qty</label>
                      <input
                        type="number"
                        min={0}
                        value={a.qty ?? 1}
                        onChange={(e) => updateQtyOrPrice(a.id, "qty", e.target.value)}
                        style={{ width: "100%", padding: 6, border: "1px solid #cbd5e1", borderRadius: 8 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12 }}>Harga/Unit</label>
                      <input
                        type="number"
                        min={0}
                        value={a.unitPrice ?? 0}
                        onChange={(e) => updateQtyOrPrice(a.id, "unitPrice", e.target.value)}
                        style={{ width: "100%", padding: 6, border: "1px solid #cbd5e1", borderRadius: 8 }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 6, textAlign: "right", fontWeight: 600 }}>
                    Total: {idr(a.totalPrice || 0)}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                    Panjang: {a.length_m} m
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12 }}>Harga/m</label>
                      <input
                        type="number"
                        min={0}
                        value={a.unitPrice ?? 0}
                        onChange={(e) => updateQtyOrPrice(a.id, "unitPrice", e.target.value)}
                        style={{ width: "100%", padding: 6, border: "1px solid #cbd5e1", borderRadius: 8 }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 6, textAlign: "right", fontWeight: 600 }}>
                    Total: {idr(a.totalPrice || 0)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[-6.914744, 107.60981]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          />

          <MapControls onAddAsset={addAsset} />
        </MapContainer>
      </div>
    </div>
  );
};

export default ProjectPlanner;
