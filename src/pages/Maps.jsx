import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import "leaflet/dist/leaflet.css"

const Maps = () => {
    const position = [-6.59444000, 106.78917000]
  return (
    <div>
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{width: '100%', height: '100vh'}}>
            
            <TileLayer  
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>
                A pretty CSS3 popup. <br /> Easily customizable.
              </Popup>
            </Marker> 
            
          </MapContainer>
    </div>
  )
}

export default Maps