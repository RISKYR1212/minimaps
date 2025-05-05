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
import Osp from './pages/Osp';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar />
    {/* //Home Route// */}
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/maps" element={<Maps />}/>
      <Route path="/fasfield" element={<Fasfield/>}/>
      <Route path="/core" element={<Core/>}/>
      <Route path="/osp" element={<Osp/>}/>
      
    </Routes>
    </>
  )
}

export default App
