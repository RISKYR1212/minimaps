// App.jsx
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom'; 

import Navbar from './componen/Navbar';
import Home from './pages/Home';
import Maps from './pages/Maps';
import Fasfield from './pages/Fasfield';
import Core from './pages/Core';
import Osp from './pages/Osp';
import Material from './pages/Material'; 

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/maps" element={<Maps />} />
        <Route path="/fasfield" element={<Fasfield />} />
        <Route path="/core" element={<Core />} />
        <Route path="/osp" element={<Osp />} />
        <Route path="/material" element={<Material />} /> 
      </Routes>
    </>
  );
}

export default App;
