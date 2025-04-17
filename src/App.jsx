import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import 'bootstrap/dist/css/bootstrap.min.css';
import { Route, Routes, ServerRouter } from 'react-router-dom';
import Home from "./pages/Home"
import Navbar  from './componen/Navbar';
import Maps from './pages/Maps'
import Fasfield from './pages/Fasfield'
import Core from './pages/Core'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar />
    {/* //Home Route// */}
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/Maps" element={<Maps />}/>
      <Route path="/Fasfield" element={<Fasfield/>}/>
      <Route path="/Core" element={<Core/>}/>
      
      
    </Routes>
    </>
  )
}

export default App
