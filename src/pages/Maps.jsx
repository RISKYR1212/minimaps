import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import "leaflet/dist/leaflet.css"

const Maps = () => {
    const position = [-6.5950, 106.8166]
  return (
    <div>
       <form className="d-flex">
        <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search"/>
        <button className="btn btn-outline-success" type="submit">Search</button>
      </form>
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{width: '100%', height: '100vh'}}>
            
            <TileLayer  
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>
                titik tujuan <br /> anda
              </Popup>
            </Marker> 
            
          </MapContainer>
    </div>
  )
}

export default Maps