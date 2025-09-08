import { Routes, Route, Link } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";

import Home from "./pages/Home";
import Maps from "./pages/Maps";
import Fasfield from "./pages/Fasfield";
import Core from "./pages/Core";
import Osp from "./pages/Osp";
import Material from "./pages/Material";
import Optimalisasi from "./pages/Optimalisasi";
import Project from "./pages/Project";

function App() {
  return (
    <>
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/">
            Rizky Rispaldi
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {/* <Nav.Link as={Link} to="/">Home</Nav.Link> */}
              <Nav.Link as={Link} to="/maps">Maps</Nav.Link>
              <Nav.Link as={Link} to="/fasfield">Fasfield</Nav.Link>
              <Nav.Link as={Link} to="/core">Core</Nav.Link>
              <Nav.Link as={Link} to="/osp">OSP</Nav.Link>
              <Nav.Link as={Link} to="/material">Material</Nav.Link>
              <Nav.Link as={Link} to="/optimalisasi">Optimalisasi</Nav.Link>
              <Nav.Link as={Link} to="/project">Project</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Routing Pages */}
      <Container className="mt-3">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/fasfield" element={<Fasfield />} />
          <Route path="/core" element={<Core />} />
          <Route path="/osp" element={<Osp />} />
          <Route path="/material" element={<Material />} />
          <Route path="/optimalisasi" element={<Optimalisasi />} />
          <Route path="/project" element={<Project />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
