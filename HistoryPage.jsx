import { useEffect, useState } from 'react'
import { getRecentHistory } from './api'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function ActionBadge({ action }) {
  const map = {
    deduct: { label: 'หยิบออก', bg: '#fff5f5', color: '#e53e3e' },
    move:   { label: 'ย้าย',    bg: '#fffbeb', color: '#d97706' },
    add:    { label: 'เพิ่ม',   bg: '#e6faf0', color: '#06c755' },
  }
  const s = map[action] || { label: action || 'อื่นๆ', bg: '#f5f5f5', color: '#888' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 6 }}>
      {s.label}
    </span>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentHistory(50).then(setHistory).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.center}><p style={{ color: '#888' }}>กำลังโหลด...</p></div>

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>ประวัติการดำเนินการ</h1>
        <p style={styles.sub}>{history.length} รายการล่าสุด</p>
      </div>

      <div style={styles.body}>
        {history.length === 0 && (
          <div style={styles.empty}>
            <span style={{ fontSize: 40 }}>📋</span>
            <p>ยังไม่มีประวัติ</p>
          </div>
        )}

        {history.map((h, i) => (
          <div key={h.id} style={styles.card}>
            {/* Row 1: action badge + เวลา */}
            <div style={styles.row1}>
              <ActionBadge action={h.action} />
              <span style={styles.time}>{formatDate(h.moved_at)}</span>
            </div>

            {/* Row 2: ชื่อสินค้า */}
            <p style={styles.itemName}>{h.item_name || `Item #${h.item_id}`}</p>
            <p style={styles.itemCode}>{h.item_code}</p>

            {/* Row 3: รายละเอียด action */}
            <div style={styles.detailRow}>
              {h.action === 'deduct' && (
                <span style={styles.detail}>
                  หยิบออก <strong>{h.qty_changed} {h.unit || 'ชิ้น'}</strong> จาก {h.from_location_label}
                </span>
              )}
              {h.action === 'move' && (
                <span style={styles.detail}>
                  {h.from_location_label} <span style={{ color: '#aaa' }}>→</span> {h.to_location_label}
                </span>
              )}
              {h.action === 'add' && (
                <span style={styles.detail}>
                  เพิ่มเข้า {h.to_location_label}
                </span>
              )}
              {!h.action && (
                <span style={styles.detail}>
                  {h.from_location_label} → {h.to_location_label}
                </span>
              )}
            </div>

            {/* Row 4: ชื่อคนทำ */}
            {h.moved_by && (
              <div style={styles.actorRow}>
                <span style={styles.actorDot} />
                <span style={styles.actorName}>{h.moved_by}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { background: '#fff', padding: '12px 16px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  title: { fontSize: 20, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  body: { flex: 1, overflowY: 'auto', padding: '12px 16px' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '60px 0', color: '#aaa' },
  card: { background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  row1: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: '#bbb' },
  itemName: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  itemCode: { fontSize: 12, color: '#aaa', marginTop: 1, marginBottom: 6 },
  detailRow: { marginBottom: 4 },
  detail: { fontSize: 13, color: '#555' },
  actorRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 },
  actorDot: { width: 6, height: 6, borderRadius: '50%', background: '#06c755' },
  actorName: { fontSize: 12, color: '#06c755', fontWeight: 600 },
}
