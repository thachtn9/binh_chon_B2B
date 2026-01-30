import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Only render app if DevTools is not open
function initApp() {
  if (window.__DEVTOOLS_OPEN__) {
    // Don't render React app, don't call any APIs
    console.clear();
    return;
  }
  
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initApp()
