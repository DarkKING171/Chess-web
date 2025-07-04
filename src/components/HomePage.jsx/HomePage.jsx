// src/components/HomePage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1f1f1f, #0f0f0f)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '2rem'
    }}>
      <h1 style={{
        fontSize: '3rem',
        background: 'linear-gradient(45deg, #4ecdc4, #ff6b6b)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        textAlign: 'center'
      }}>
        ♟️ Bienvenido a Chess Battle
      </h1>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => navigate('/vs-cpu')}
          style={buttonStyle}
        >
          🤖 Jugar contra la Computadora
        </button>

        <button 
          onClick={() => navigate('/online')}
          style={{ ...buttonStyle, backgroundColor: '#252525', borderColor: '#666' }}
        >
          🌐 Jugar en Línea
        </button>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '16px 28px',
  fontSize: '18px',
  fontWeight: '600',
  backgroundColor: '#1a1a1a',
  border: '2px solid #444',
  borderRadius: '12px',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
};

export default HomePage;
