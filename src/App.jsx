import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VoteProvider } from './context/VoteContext'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import VotePage from './pages/VotePage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/AdminPage'
import ResultsPage from './pages/ResultsPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VoteProvider>
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
          <Footer />
        </VoteProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
