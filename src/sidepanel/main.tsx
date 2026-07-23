import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../styles/fonts';
import '../styles/tokens.css';
import './styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('PageAgent: #root not found');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
