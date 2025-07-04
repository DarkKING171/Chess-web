// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './components/HomePage/HomePage.jsx';
import OnlineGame from './components/Navigation/OnlineGame.jsx';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vs-cpu" element={<App />} />
        <Route path="/online" element={<OnlineGame />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);