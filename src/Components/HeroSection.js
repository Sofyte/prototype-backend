import React from 'react';
import '../App.css';
import './HeroSection.css';
import { Link } from 'react-router-dom';

function HeroSection() {
  return (
    <div className='hero-container'>
      <h1>Welcome to REQFA</h1>
      <p>Your accessibility requirements journey starts here</p>
      <div className='hero-btns'>
        <Link to='/create' className='btn btn--outline btn--large'>
          CREATE A PROJECT
        </Link>
        <Link to='/about' className='btn btn--primary btn--large'>
          LEARN MORE
        </Link>
      </div>
    </div>
  );
}

export default HeroSection;
