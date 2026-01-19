import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversalAccess, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Button } from './Button';

function Navbar() {
  const [click, setClick] = useState(false);
  const [button, setButton] = useState(true);

  const handleClick = () => setClick(!click);
  const closeMobileMenu = () => setClick(false);

  const showButton = () => {
    if (window.innerWidth <= 960) {
      setButton(false);
    } else {
      setButton(true);
    }
  };

  useEffect(() => {
    showButton();
    window.addEventListener('resize', showButton);
    return () => window.removeEventListener('resize', showButton);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-logo" onClick={closeMobileMenu}>
          <FontAwesomeIcon icon={faUniversalAccess} />
          REQFA
        </NavLink>

        <div className="menu-icon" onClick={handleClick}>
          <FontAwesomeIcon icon={click ? faTimes : faBars} />
        </div>

        <div className="nav-right">
          <ul className={click ? 'nav-menu active' : 'nav-menu'}>
            <li className="nav-item">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-links active' : 'nav-links'} onClick={closeMobileMenu}>Home</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-links active' : 'nav-links'} onClick={closeMobileMenu}>About</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/myprojects" className={({ isActive }) => isActive ? 'nav-links active' : 'nav-links'} onClick={closeMobileMenu}>Projects</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/create" className={({ isActive }) => isActive ? 'nav-links active' : 'nav-links'} onClick={closeMobileMenu}>Create new</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/sign-up" className="nav-links-mobile" onClick={closeMobileMenu}>Sign up</NavLink>
            </li>
          </ul>
          {button && <Button buttonStyle="btn--outline">SIGN UP</Button>}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
