import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaMoon, FaSun, FaUserCircle, FaBars } from 'react-icons/fa';

const Navbar = () => {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleTheme = () => setDarkMode((prev) => !prev);
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navbarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: darkMode ? '#212529' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: !darkMode ? 'blur(10px)' : 'none',
    WebkitBackdropFilter: !darkMode ? 'blur(10px)' : 'none',
    transition: 'all 0.4s ease',
    boxShadow: scrolled ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
    paddingTop: scrolled ? '6px' : '16px',
    paddingBottom: scrolled ? '6px' : '16px',
    zIndex: 1050,
  };

  const navLinkBase = {
    fontWeight: 'bold',
    padding: '8px 16px',
    display: 'inline-block',
    transition: 'all 0.3s ease-in-out',
    textDecoration: 'none',
  };

  const activeLinkStyle = darkMode
    ? { color: '#ffc107', borderBottom: '2px solid #ffc107' }
    : { color: '#0d6efd', borderBottom: '2px solid #0d6efd' };

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/maps', label: 'Maps' },
    { path: '/fasfield', label: 'Fastfield' },
    { path: '/core', label: 'AlokasiCore' },
    { path: '/osp', label: 'OSP' },
    { path: '/material', label: 'Material' },
  ];

  return (
    <>
      <nav
        className={`navbar fixed-top navbar-expand-lg ${darkMode ? 'navbar-dark' : 'navbar-light'}`}
        style={navbarStyle}
      >
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <Link to="/" className="navbar-brand d-flex align-items-center" style={{
            fontWeight: 'bold',
            fontSize: scrolled ? '1rem' : '1.2rem',
            transition: 'font-size 0.3s ease',
          }}>
            <img
              src="https://jlm.net.id/new-logo-jlm.png"
              alt="Logo JLM"
              style={{
                height: scrolled ? '28px' : '36px',
                marginRight: '8px',
                transition: 'all 0.3s ease',
              }}
            />
            Rizky Rispaldi
          </Link>

          <div className="d-flex align-items-center">
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={toggleTheme}>
              {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
            </button>

            <FaUserCircle size={26} className="text-secondary me-3" />

            <button
              className="btn btn-outline-primary d-lg-none"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#sidebarMenu"
              aria-controls="sidebarMenu"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`offcanvas offcanvas-start ${darkMode ? 'text-bg-dark' : ''}`}
        tabIndex="-1"
        id="sidebarMenu"
        aria-labelledby="sidebarMenuLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="sidebarMenuLabel">Menu</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <ul className="navbar-nav">
            {navItems.map(({ path, label }) => (
              <li key={path} className="nav-item">
                <Link
                  to={path}
                  className="nav-link"
                  style={{
                    ...navLinkBase,
                    ...(isActive(path) ? activeLinkStyle : {}),
                  }}
                  data-bs-dismiss="offcanvas"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navbar;
