import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => setDarkMode(prev => !prev);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar navbar-expand-lg shadow-sm ${darkMode ? 'navbar-dark bg-dark' : 'navbar-light bg-light'}`}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {/* Logo + Title */}
        <Link to="/" className="navbar-brand d-flex align-items-center">
          <img
            src="https://jlm.net.id/new-logo-jlm.png"
            alt="Logo JLM"
            style={{ height: '40px', marginRight: '10px' }}
          />
          <span className="fw-bold">JLM Patrol</span>
        </Link>

        {/* Theme Toggle */}
        <button className="btn btn-sm btn-outline-secondary me-2" onClick={toggleTheme}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>

        {/* Hamburger Menu */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Menu Items */}
        <div className="collapse navbar-collapse mt-2 mt-lg-0" id="navbarNav">
          <div className="navbar-nav ms-auto text-center">
            {[
              { path: '/', label: 'Home' },
              { path: '/maps', label: 'Maps' },
              { path: '/fasfield', label: 'Fastfield' },
              { path: '/core', label: 'AlokasiCore' },
              { path: '/osp', label: 'OSP' },
              { path: '/material', label: 'Material' }
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link fw-bold px-3 py-2 ${
                  isActive(path)
                    ? darkMode
                      ? 'text-warning border-bottom border-warning'
                      : 'text-primary border-bottom border-primary'
                    : ''
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
