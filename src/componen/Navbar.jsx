import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary shadow-sm">
      <div className="container-fluid">
        {/* Logo */}
        <a href="/" className="navbar-brand d-flex align-items-center">
          <img
            src="https://jlm.net.id/new-logo-jlm.png"
            alt="Logo JLM"
            style={{ height: '40px', marginRight: '30px' }}
          />
        </a>

        {/* Toggler for mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavGrid"
          aria-controls="navbarNavGrid"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Navbar Items */}
        <div className="collapse navbar-collapse" id="navbarNavGrid">
          <div className="container">
            <div className="row g-4">
              <div className="col-6 col-md-auto">
                <Link className="nav-link fw-bold fs-5" to="/">
                  Home
                </Link>
              </div>
              <div className="col-6 col-md-auto">
                <Link className="nav-link fw-bold fs-5" to="/maps">
                  Maps
                </Link>
              </div>
              <div className="col-6 col-md-auto">
                <Link className="nav-link fw-bold fs-5" to="/fasfield">
                  Fastfield
                </Link>
              </div>
              <div className="col-6 col-md-auto">
                <Link className="nav-link fw-bold fs-5" to="/core">
                  AlokasiCore
                </Link>
              </div>
              <div className="col-6 col-md-auto">
                <Link className="nav-link fw-bold fs-5" to="/osp">
                  OSP
                </Link>
              </div>
              <div className="col-6 col-md-auto">
                <Link className="nav-link fw-bold fs-5" to="/material">
                  Material
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
