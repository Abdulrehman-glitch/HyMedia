import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div>
          <h1>HyMedia</h1>
          <p>Cloud-native multimedia platform</p>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/gallery">Gallery</NavLink>
        <NavLink to="/upload">Upload</NavLink>
      </nav>
    </header>
  );
}
