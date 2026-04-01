import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/search', label: 'ค้นหา',    icon: '🔍' },
  { path: '/add',    label: 'เพิ่มสินค้า', icon: '➕' },
  { path: '/map',    label: 'แผนที่',    icon: '🗺️' },
  { path: '/history',label: 'ประวัติ',   icon: '📋' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={styles.nav}>
      {tabs.map((t) => {
        const active = pathname === t.path
        return (
          <button key={t.path} onClick={() => navigate(t.path)} style={styles.btn}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ ...styles.label, color: active ? '#06c755' : '#888', fontWeight: active ? 600 : 400 }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: { display: 'flex', background: '#fff', borderTop: '1px solid #e2e8f0', paddingBottom: 'env(safe-area-inset-bottom)' },
  btn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', gap: 2 },
  label: { fontSize: 10 },
}
