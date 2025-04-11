import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import "leaflet/dist/leaflet.css"
// import Geocoder from 'leaflet-control-geocoder'



const Maps = () => {
  const Location = [
    {
      "lat":  -6.511809,
      "long": 106.812800
    },
    {
      "lat":  -6.512583,
      "long": 106.812691
      
    },
    {
      "lat" :  -6.513749,
      "long" : 106.813577
    }

  ];
  const polylinePositions = [
    [-6.200000, 106.816666], // Jakarta
    [-6.914864, 107.608238], // Bandung
    [-7.250445, 112.768845], // Surabaya
  ];

  const polylineOption = { color: 'blue'}

  return (


    <div>


      <MapContainer center={[Location[0].lat, Location[0].long]} zoom={13} scrollWheelZoom={false} style={{ width: '100%', height: '100vh' }}>

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={polylinePositions} pathOptions={polylineOption} />
        {/* <Marker position={[-6.5950, 106.8166,-6.2088, 106.8456]}>
          <Popup>
            titik tujuan <br /> anda
          </Popup>
        </Marker> */}
        {Location.map((L) => (
          <Marker position={[L.lat, L.long]}></Marker>
        ))}

      </MapContainer>
    </div>
  )
}

export default Maps