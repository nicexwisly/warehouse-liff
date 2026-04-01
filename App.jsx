import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import liff from '@line/liff'
import BottomNav from './BottomNav'
import SearchPage from './SearchPage'
import AddItemPage from './AddItemPage'
import MapPage from './MapPage'
import HistoryPage from './HistoryPage'

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
      .then(async () => {
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile()
          setProfile(p)
        }
        setReady(true)
      })
      .catch(e => setError(e.message))
  }, [])

  if (error) return <div style={styles.center}><p style={{ color: '#e53e3e' }}>เกิดข้อผิดพลาด: {error}</p></div>
  if (!ready) return <div style={styles.center}><div style={styles.spinner} /><p style={{ color: '#888', marginTop: 12 }}>กำลังโหลด...</p></div>

  return (
    <BrowserRouter>
      <div style={styles.app}>
        <div style={styles.content}>
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<SearchPage profile={profile} />} />
            <Route path="/add" element={<AddItemPage profile={profile} />} />
            <Route path="/map" element={<MapPage profile={profile} />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

const styles = {
  app: { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f5f5f5' },
  content: { flex: 1, overflowY: 'auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh' },
  spinner: { width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#06c755', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
}
