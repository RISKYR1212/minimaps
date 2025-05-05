import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <div>
        <nav className="navbar navbar-expand-lg bg-body-tertiary">
  <div className="container-fluid">
  <a href="/" className="logo d-flex align-items-center">
                <img src="https://jlm.net.id/new-logo-jlm.png" alt="Logo JLM"/>
            </a>
    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
      <span className="navbar-toggler-icon"></span>
    </button>
    <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
      <div className="navbar-nav">
        <Link className="nav-link active" style={{fontFamily: 'sans-serif', fontSize: 30, fontWeight: 'bold'}} aria-current="page" to="/">Home</Link>
        <Link className="nav-link" style={{fontFamily: 'sans-serif', fontSize: 30, fontWeight: 'bold'}} to="/maps">Maps</Link>
        <Link className="nav-link" style={{fontFamily: 'sans-serif', fontSize: 30, fontWeight: 'bold'}} to="/fasfield">Fastfield</Link>
        <Link className="nav-link" style={{fontFamily: 'sans-serif', fontSize: 30, fontWeight: 'bold'}} to="/core">AlokasiCore</Link>
        <Link className="nav-link" style={{fontFamily: 'sans-serif', fontSize: 30, fontWeight: 'bold'}} to="/osp">OSP</Link>
        {/* <Link className="nav-link disabled" aria-disabled="true">D</Link> */}
      </div>
    </div>
  </div>
</nav>
    </div>
  )
}

export default Navbar