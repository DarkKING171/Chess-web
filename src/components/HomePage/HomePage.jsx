// src/components/HomePage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>
        ♟️ Chess Arena
      </h1>

      <button
        onClick={() => navigate('/vs-cpu')}
        style={{
          marginBottom: '1rem',
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: '#4ecdc4',
          color: '#000',
          cursor: 'pointer'
        }}
      >
        Jugar contra la computadora
      </button>

      <button
        onClick={() => navigate('/online')}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          borderRadius: '12px',
          border: '1px solid #4ecdc4',
          backgroundColor: 'transparent',
          color: '#4ecdc4',
          cursor: 'pointer'
        }}
      >
        Jugar en línea (modo en desarrollo)
      </button>
    </div>
  );
};

export default HomePage;
