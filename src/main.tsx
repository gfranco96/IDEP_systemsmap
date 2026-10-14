import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider, initialState } from './state/store';
import { decodeHash } from './state/urlState';
import { graph } from './data/loadData';
import './styles/tokens.css';
import './styles/app.css';

// Restore from the URL hash if present; otherwise open the About panel (first visit).
const fromHash = decodeHash(window.location.hash, graph);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider init={fromHash ?? initialState}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
