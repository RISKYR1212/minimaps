import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import 'bootstrap/dist/css/bootstrap.min.css';
import { Route, Routes, ServerRouter } from 'react-router-dom';
import Home from "./pages/Home"
import Navbar  from './componen/Navbar';
import Maps from './pages/Maps'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar />
    {/* //Home Route// */}
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/maps" element={<Maps />}/>
      
      
    </Routes>
    </>
  )
}

export default App
