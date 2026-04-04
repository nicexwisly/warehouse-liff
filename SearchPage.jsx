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
            <div style={styles.listScroller}>
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
                    <div style={styles.nameTextWrap}>
                      <p style={styles.itemName}>{item.item_name}</p>
                      <p style={styles.itemMeta}>พาเลท {item.pallet_code}</p>
                    </div>
                  </div>
                  <div style={styles.codeCell}>{item.item_code}</div>
                  <div style={styles.locationCell}>
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

  listShell: {
    background: theme.panel,
    borderRadius: 14,
    border: `1px solid ${theme.line}`,
    overflow: 'hidden',
    boxShadow: theme.shadowSoft,
  },
  listScroller: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  listHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1.8fr) minmax(78px, 1fr) minmax(92px, 1fr) minmax(88px, 0.8fr)',
    minWidth: 520,
    padding: '10px 12px',
    fontSize: 'clamp(11px, 2.8vw, 12px)',
    fontWeight: 600,
    color: theme.textSoft,
    background: theme.toolbarStrong,
    borderBottom: `1px solid ${theme.line}`,
    columnGap: 10,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1.8fr) minmax(78px, 1fr) minmax(92px, 1fr) minmax(88px, 0.8fr)',
    minWidth: 520,
    padding: '10px 12px',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.lineSoft}`,
    columnGap: 10,
  },
  rowSelected: { background: theme.blueSoft },
  nameCell: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  itemIcon: {
    width: 'clamp(26px, 7vw, 30px)',
    height: 'clamp(26px, 7vw, 30px)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.toolbar,
    border: `1px solid ${theme.lineSoft}`,
    flexShrink: 0,
    fontSize: 'clamp(14px, 3.8vw, 16px)',
  },
  nameTextWrap: { minWidth: 0 },
  itemName: {
    fontSize: 'clamp(12px, 3.2vw, 14px)',
    fontWeight: 600,
    color: theme.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    fontSize: 'clamp(10px, 2.7vw, 12px)',
    color: theme.textSoft,
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  codeCell: {
    fontSize: 'clamp(11px, 2.9vw, 13px)',
    color: theme.textMuted,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  locationCell: {
    minWidth: 0,
  },
  locationBadge: {
    display: 'inline-flex',
    maxWidth: '100%',
    background: '#f0f6ff',
    color: theme.blue,
    border: '1px solid rgba(10,132,255,0.18)',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 'clamp(10px, 2.7vw, 12px)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  qtyCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, minWidth: 0 },
  qty: { fontSize: 'clamp(16px, 4.8vw, 20px)', fontWeight: 700, color: theme.text, lineHeight: 1 },
  rowAction: {
    ...theme.button,
    padding: '6px 8px',
    fontSize: 'clamp(10px, 2.7vw, 12px)',
    color: theme.red,
    background: theme.redSoft,
    whiteSpace: 'nowrap',
  },
}
