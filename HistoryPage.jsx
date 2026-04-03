import { useEffect, useState } from 'react'
import { getRecentHistory } from './api'
import { theme } from './theme'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function ActionBadge({ action }) {
  const map = {
    deduct: { label: 'หยิบออก', bg: theme.redSoft, color: theme.red },
    move: { label: 'ย้าย', bg: '#fff8e8', color: '#c27c10' },
    add: { label: 'เพิ่ม', bg: theme.greenSoft, color: '#208142' },
  }
  const s = map[action] || { label: action || 'อื่นๆ', bg: theme.toolbar, color: theme.textMuted }
  return <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 999, border: `1px solid ${theme.lineSoft}` }}>{s.label}</span>
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentHistory(50).then(setHistory).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.center}><p style={{ color: theme.textSoft }}>กำลังโหลด...</p></div>

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>History</h1>
        <p style={styles.sub}>{history.length} รายการล่าสุด</p>
      </div>

      <div style={styles.body}>
        {history.length === 0 && <div style={styles.empty}><span style={{ fontSize: 40 }}>📋</span><p>ยังไม่มีประวัติ</p></div>}

        <div style={styles.listShell}>
          {history.map((h, i) => (
            <div key={h.id} style={{ ...styles.card, borderTop: i === 0 ? 'none' : `1px solid ${theme.lineSoft}` }}>
              <div style={styles.row1}>
                <ActionBadge action={h.action} />
                <span style={styles.time}>{formatDate(h.moved_at)}</span>
              </div>
              <p style={styles.itemName}>{h.item_name || `Item #${h.item_id}`}</p>
              <p style={styles.itemCode}>{h.item_code}</p>
              <div style={styles.detailRow}>
                {h.action === 'deduct' && <span style={styles.detail}>หยิบออก <strong>{h.qty_changed} {h.unit || 'ชิ้น'}</strong> จาก {h.from_location_label}</span>}
                {h.action === 'move' && <span style={styles.detail}>{h.from_location_label} <span style={{ color: theme.textSoft }}>→</span> {h.to_location_label}</span>}
                {h.action === 'add' && <span style={styles.detail}>เพิ่มเข้า {h.to_location_label}</span>}
                {!h.action && <span style={styles.detail}>{h.from_location_label} → {h.to_location_label}</span>}
              </div>
              {h.moved_by && <div style={styles.actorRow}><span style={styles.actorDot} /><span style={styles.actorName}>{h.moved_by}</span></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { background: theme.toolbar, padding: '14px 16px 12px', borderBottom: `1px solid ${theme.line}` },
  title: { fontSize: 24, fontWeight: 700, color: theme.text },
  sub: { fontSize: 12, color: theme.textSoft, marginTop: 2 },
  body: { flex: 1, overflowY: 'auto', padding: 14 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '60px 0', color: theme.textSoft },
  listShell: { background: theme.panel, borderRadius: 14, border: `1px solid ${theme.line}`, overflow: 'hidden', boxShadow: theme.shadowSoft },
  card: { padding: '12px 14px' },
  row1: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: theme.textSoft },
  itemName: { fontSize: 15, fontWeight: 600, color: theme.text },
  itemCode: { fontSize: 12, color: theme.textSoft, marginTop: 1, marginBottom: 6 },
  detailRow: { marginBottom: 4 },
  detail: { fontSize: 13, color: theme.textMuted },
  actorRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 },
  actorDot: { width: 6, height: 6, borderRadius: '50%', background: theme.blue },
  actorName: { fontSize: 12, color: theme.blue, fontWeight: 600 },
}
