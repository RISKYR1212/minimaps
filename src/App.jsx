import { useState } from 'react';
import { Routes, Route } from 'react-router-dom'; 

import Navbar from './componen/Navbar';
import Home from './pages/Home';
import Maps from './pages/Maps';
import Fasfield from './pages/Fasfield';
import Core from './pages/Core';
import Osp from './pages/Osp';
import Material from './pages/Material'; 
import Boq from './pages/Boq';   // pastikan file namanya "Boq.jsx"
import Inventory from './pages/Inventory';
import Project from './pages/Project';

function App() {
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
        <Route path="/boq" element={<Boq />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/project" element={<Project />} />
      </Routes>
    </>
  );
}

export default App;
