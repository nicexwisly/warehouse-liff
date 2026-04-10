import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import liff from '@line/liff'
import BottomNav from './BottomNav'
import SearchPage from './SearchPage'
import MapPage from './MapPage'
import HistoryPage from './HistoryPage'
import { theme, trafficLights } from './theme'

function TrafficLights() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: trafficLights.red, display: 'inline-block' }} />
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: trafficLights.yellow, display: 'inline-block' }} />
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: trafficLights.green, display: 'inline-block' }} />
    </div>
  )
}

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

  if (error) return <div style={styles.center}><p style={{ color: theme.red }}>เกิดข้อผิดพลาด: {error}</p></div>
  if (!ready) return <div style={styles.center}><div style={styles.spinner} /><p style={{ color: theme.textSoft, marginTop: 12 }}>กำลังโหลด...</p></div>

  return (
    <BrowserRouter>
      <div style={styles.shell}>
        <div style={styles.window}>
          <div style={styles.titlebar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <TrafficLights />
              <div style={styles.windowTitle}>Warehouse</div>
            </div>
            <div style={styles.badge}>{profile?.displayName || 'LIFF App'}</div>
          </div>

          <div style={styles.app}>
            <div style={styles.content}>
              <Routes>
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route path="/search" element={<SearchPage profile={profile} />} />
                <Route path="/map" element={<MapPage profile={profile} />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
            </div>
            <BottomNav />
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

const styles = {
  shell: { minHeight: '100dvh', background: theme.bg, padding: 10 },
  window: { height: 'calc(100dvh - 20px)', background: theme.window, border: `1px solid ${theme.line}`, borderRadius: 18, overflow: 'hidden', boxShadow: theme.shadow },
  titlebar: { height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: theme.toolbar, borderBottom: `1px solid ${theme.line}` },
  windowTitle: { fontSize: 13, fontWeight: 600, color: theme.text },
  badge: { fontSize: 12, color: theme.textMuted, background: 'rgba(255,255,255,0.72)', padding: '6px 10px', borderRadius: 999, border: `1px solid ${theme.lineSoft}` },
  app: { display: 'flex', flexDirection: 'column', height: 'calc(100% - 48px)', background: theme.sidebar },
  content: { flex: 1, overflowY: 'auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: theme.bg },
  spinner: { width: 34, height: 34, border: '3px solid rgba(60,60,67,0.18)', borderTopColor: theme.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
}
