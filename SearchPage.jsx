import { useState } from 'react'
import { searchItems, deductItem } from './api'
import BarcodeScanner from './BarcodeScanner'
import { theme } from './theme'

const BASE = import.meta.env.VITE_API_URL

export default function SearchPage({ profile }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  async function handleSearch(query) {
    const val = (query ?? q).trim()
    if (!val) return
    setLoading(true)
    try {
      setResults(await searchItems(val))
      setSearched(true)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleScanResult(val) {
    setShowScanner(false)
    setQ(val)
    let searchVal = val
    if (/^\d{8,}$/.test(val)) {
      try {
        const res = await fetch(`${BASE}/master/items?q=${encodeURIComponent(val)}&limit=1`)
        const data = await res.json()
        if (data.length > 0) searchVal = data[0].code
      } catch {}
    }
    handleSearch(searchVal)
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
    <>
      {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}

      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            {profile && <p style={styles.greeting}>สวัสดี {profile.displayName}</p>}
            <h1 style={styles.title}>Inventory</h1>
            <p style={styles.sub}>ค้นหาด้วยชื่อสินค้า รหัสสินค้า หรือ barcode</p>
          </div>
        </div>

        <div style={styles.toolbar}>
          <input
            style={styles.input}
            placeholder="Search items..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          <button onClick={() => setShowScanner(true)} style={styles.secondaryBtn} title="สแกน barcode">📷</button>
          <button onClick={() => handleSearch()} style={styles.primaryBtn} disabled={loading}>{loading ? '...' : 'ค้นหา'}</button>
        </div>

        <div style={styles.body}>
          <div style={styles.pathBar}>Favorites / Inventory / Search</div>
          {searched && !loading && <p style={styles.count}>{results.length > 0 ? `พบ ${results.length} รายการ` : 'ไม่พบสินค้านี้ในระบบ'}</p>}

          <div style={styles.listShell}>
            <div style={styles.listHeader}>
              <div>Name</div>
              <div>Code</div>
              <div>Location</div>
              <div style={{ textAlign: 'right' }}>Qty</div>
            </div>
            {results.map((item, index) => (
              <div key={item.id} style={{ ...styles.row, ...(index === 0 ? styles.rowSelected : null) }}>
                <div style={styles.nameCell}>
                  <div style={styles.itemIcon}>📦</div>
                  <div>
                    <p style={styles.itemName}>{item.item_name}</p>
                    <p style={styles.itemMeta}>พาเลท {item.pallet_code}</p>
                  </div>
                </div>
                <div style={styles.codeCell}>{item.item_code}</div>
                <div>
                  <div style={styles.locationBadge}>{item.location_label}</div>
                </div>
                <div style={styles.qtyCell}>
                  <div style={styles.qty}>{item.qty}</div>
                  <button onClick={() => handleDeduct(item)} style={styles.rowAction}>หยิบออก</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { background: theme.toolbar, borderBottom: `1px solid ${theme.line}`, padding: '14px 16px 12px' },
  greeting: { fontSize: 12, color: theme.textSoft, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 2 },
  sub: { fontSize: 13, color: theme.textMuted },
  toolbar: { display: 'flex', gap: 8, padding: 14, background: theme.window, borderBottom: `1px solid ${theme.lineSoft}` },
  input: { ...theme.input, flex: 1 },
  secondaryBtn: { ...theme.button, padding: '10px 12px', fontSize: 18 },
  primaryBtn: { ...theme.primaryButton, padding: '10px 16px', fontWeight: 600, fontSize: 14 },
  body: { flex: 1, overflowY: 'auto', padding: 14 },
  pathBar: { background: theme.toolbar, border: `1px solid ${theme.lineSoft}`, borderRadius: 10, padding: '8px 12px', fontSize: 12, color: theme.textMuted, marginBottom: 12 },
  count: { fontSize: 13, color: theme.textMuted, marginBottom: 10 },
  listShell: { background: theme.panel, borderRadius: 14, border: `1px solid ${theme.line}`, overflow: 'hidden', boxShadow: theme.shadowSoft },
  listHeader: { display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: theme.textSoft, background: theme.toolbarStrong, borderBottom: `1px solid ${theme.line}` },
  row: { display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr', padding: '12px 14px', alignItems: 'center', borderBottom: `1px solid ${theme.lineSoft}` },
  rowSelected: { background: theme.blueSoft },
  nameCell: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  itemIcon: { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.toolbar, border: `1px solid ${theme.lineSoft}` },
  itemName: { fontSize: 14, fontWeight: 600, color: theme.text },
  itemMeta: { fontSize: 12, color: theme.textSoft, marginTop: 2 },
  codeCell: { fontSize: 13, color: theme.textMuted },
  locationBadge: { display: 'inline-flex', background: '#f0f6ff', color: theme.blue, border: '1px solid rgba(10,132,255,0.18)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  qtyCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  qty: { fontSize: 20, fontWeight: 700, color: theme.text },
  rowAction: { ...theme.button, padding: '6px 10px', fontSize: 12, color: theme.red, background: theme.redSoft },
}
