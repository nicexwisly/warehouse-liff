import { useNavigate, useLocation } from 'react-router-dom'
import { theme } from './theme'

const tabs = [
  { path: '/search', label: 'ค้นหา', icon: '🔍' },
  { path: '/map', label: 'แผนที่', icon: '🗺️' },
  { path: '/history', label: 'ประวัติ', icon: '📋' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={styles.nav}>
      {tabs.map((t) => {
        const active = pathname === t.path
        return (
          <button key={t.path} onClick={() => navigate(t.path)} style={{ ...styles.btn, ...(active ? styles.btnActive : null) }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ ...styles.label, color: active ? theme.text : theme.textMuted, fontWeight: active ? 600 : 500 }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: { display: 'flex', gap: 8, padding: '10px 12px calc(env(safe-area-inset-bottom) + 10px)', background: theme.toolbar, borderTop: `1px solid ${theme.line}` },
  btn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', gap: 4 },
  btnActive: { background: 'rgba(255,255,255,0.75)', borderColor: theme.lineSoft, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' },
  label: { fontSize: 11 },
}
