import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaMoon, FaSun, FaUserCircle, FaBars } from "react-icons/fa";
import { Offcanvas } from "bootstrap";

const Navbar = () => {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleTheme = () => setDarkMode((prev) => !prev);
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    // { path: "/", label: "Home" },
    { path: "/maps", label: "Maps" },
    { path: "/fasfield", label: "Fastfield" },
    { path: "/core", label: "Alokasi Core" },
    { path: "/osp", label: "OSP" },
    { path: "/material", label: "Material" },
    { path: "/boq", label: "BoQ" },
    { path: "/project", label: "Project" },
  ];

  const handleLinkClick = () => {
    const sidebar = document.getElementById("sidebarMenu");
    if (sidebar) {
      const bsOffcanvas = Offcanvas.getInstance(sidebar);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      }
    }
  };

  return (
    <>
      {/* Navbar Atas */}
      <nav
        className={`navbar navbar-expand-lg fixed-top ${
          darkMode ? "navbar-dark bg-dark" : "navbar-light bg-white shadow-sm"
        }`}
        style={{
          transition: "all 0.4s ease",
          paddingTop: scrolled ? "6px" : "12px",
          paddingBottom: scrolled ? "6px" : "12px",
        }}
      >
        <div className="container-fluid">
          {/* Logo & Brand */}
          <Link to="/" className="navbar-brand d-flex align-items-center">
            <img
              src="https://jlm.net.id/new-logo-jlm.png"
              alt="Logo JLM"
              style={{
                height: scrolled ? "26px" : "34px",
                marginRight: "8px",
                transition: "all 0.3s ease",
              }}
            />
            <span style={{ fontWeight: "bold" }}>Rizky Rispaldi</span>
          </Link>

          {/* Menu Desktop */}
          <div className="d-none d-lg-flex ms-auto">
            <ul className="navbar-nav me-3">
              {navItems.map(({ path, label }) => (
                <li key={path} className="nav-item">
                  <Link
                    to={path}
                    className={`nav-link fw-semibold ${
                      isActive(path)
                        ? darkMode
                          ? "text-warning border-bottom border-warning"
                          : "text-primary border-bottom border-primary"
                        : ""
                    }`}
                    style={{ padding: "8px 12px" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Side Icon */}
          <div className="d-flex align-items-center">
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={toggleTheme}
            >
              {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
            </button>
            <FaUserCircle size={26} className="text-secondary me-3" />

            {/* Sidebar Toggle (Mobile) */}
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

      {/* Sidebar Mobile */}
      <div
        className={`offcanvas offcanvas-start ${darkMode ? "text-bg-dark" : ""}`}
        tabIndex="-1"
        id="sidebarMenu"
        aria-labelledby="sidebarMenuLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="sidebarMenuLabel">
            Menu
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          <ul className="navbar-nav">
            {navItems.map(({ path, label }) => (
              <li key={path} className="nav-item">
                <Link
                  to={path}
                  className={`nav-link fw-semibold ${
                    isActive(path)
                      ? darkMode
                        ? "text-warning border-bottom border-warning"
                        : "text-primary border-bottom border-primary"
                      : ""
                  }`}
                  onClick={handleLinkClick}
                  style={{ padding: "10px 14px" }}
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
