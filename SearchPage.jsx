import { useState } from 'react'
import { searchItems, deductItem } from './api'

export default function SearchPage({ profile }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!q.trim()) return
    setLoading(true)
    try {
      setResults(await searchItems(q.trim()))
      setSearched(true)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeduct(item) {
    const input = window.prompt(`หยิบ "${item.item_name}" ออกกี่ชิ้น? (มี ${item.qty} ${item.unit || 'ชิ้น'})`)
    if (!input) return
    const qty = Number(input)
    if (isNaN(qty) || qty <= 0) return alert('จำนวนไม่ถูกต้อง')
    try {
      const res = await deductItem(item.id, {
        qty,
        actor_name: profile?.displayName,
        actor_user_id: profile?.userId,
      })
      alert(res.message)
      setResults(await searchItems(q.trim()))
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        {profile && <p style={styles.greeting}>สวัสดี {profile.displayName}</p>}
        <h1 style={styles.title}>ค้นหาสินค้า</h1>
        <div style={styles.searchRow}>
          <input style={styles.input} placeholder="ชื่อสินค้า หรือ รหัสสินค้า..."
            value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} autoFocus />
          <button onClick={handleSearch} style={styles.btn} disabled={loading}>
            {loading ? '...' : 'ค้นหา'}
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {searched && !loading && (
          <p style={styles.count}>{results.length > 0 ? `พบ ${results.length} รายการ` : 'ไม่พบสินค้านี้ในระบบ'}</p>
        )}
        {results.map(item => (
          <div key={item.id} style={styles.card}>
            <div style={styles.locationBadge}>{item.location_label}</div>
            <div style={styles.cardBody}>
              <div style={styles.cardLeft}>
                <p style={styles.itemName}>{item.item_name}</p>
                <p style={styles.itemCode}>{item.item_code} · พาเลท {item.pallet_code}</p>
              </div>
              <div style={styles.cardRight}>
                <p style={styles.qty}>{item.qty}</p>
                <p style={styles.unit}>{item.unit || 'ชิ้น'}</p>
              </div>
            </div>
            <button onClick={() => handleDeduct(item)} style={styles.deductBtn}>หยิบออก</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { background: '#fff', padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  greeting: { fontSize: 12, color: '#888', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 10, color: '#1a1a1a' },
  searchRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' },
  btn: { padding: '11px 18px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  body: { flex: 1, overflowY: 'auto', padding: '12px 16px' },
  count: { fontSize: 13, color: '#888', marginBottom: 10 },
  card: { background: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  locationBadge: { background: '#06c755', color: '#fff', fontSize: 18, fontWeight: 800, padding: '10px 16px', letterSpacing: 1 },
  cardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' },
  cardLeft: { display: 'flex', flexDirection: 'column', gap: 3 },
  itemName: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  itemCode: { fontSize: 12, color: '#888' },
  cardRight: { textAlign: 'right' },
  qty: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 },
  unit: { fontSize: 12, color: '#888' },
  deductBtn: { width: '100%', padding: '11px', background: '#fff5f5', color: '#e53e3e', border: 'none', borderTop: '1px solid #fee2e2', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
}
