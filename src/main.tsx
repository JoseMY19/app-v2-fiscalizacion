import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.css';
import App from './App';
import { iniciarCapturaInstalacion, pedirAlmacenamientoPersistente } from './lib/pwa-instalacion';

iniciarCapturaInstalacion();
void pedirAlmacenamientoPersistente();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
