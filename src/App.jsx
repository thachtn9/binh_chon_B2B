import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VoteProvider } from './context/VoteContext'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import VotePage from './pages/VotePage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/AdminPage'
import useDevToolsDetection from './hooks/useDevToolsDetection'
import './index.css'

// DevTools Warning Component
const DevToolsWarning = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          borderRadius: '16px',
          backgroundColor: '#16213e',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          maxWidth: '500px',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            marginBottom: '20px',
          }}
        >
          🔒
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: '#e94560',
          }}
        >
          DevTools Detected
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#a0a0a0',
            marginBottom: '24px',
            lineHeight: '1.6',
          }}
        >
          Developer tools have been detected. Please close DevTools and reload the page to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: '#e94560',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#c73e54')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#e94560')}
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <Footer />
    </>
  )
}

function App() {
  const isDevToolsOpen = useDevToolsDetection()

  if (isDevToolsOpen) {
    return <DevToolsWarning />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <VoteProvider>
          <AppContent />
        </VoteProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
