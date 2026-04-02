import { useState, useEffect } from 'react'
import liff from '@line/liff'
import { addItem } from './api'
import ItemSearchInput from './ItemSearchInput'

const BASE = import.meta.env.VITE_API_URL

export default function AddItemPage({ profile }) {
  const [item, setItem] = useState({ item_code: '', item_name: '' })
  const [qty, setQty] = useState(1)
  const [pallets, setPallets] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedPallet, setSelectedPallet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/pallets`).then(r => r.json()),
      fetch(`${BASE}/locations`).then(r => r.json()),
    ]).then(([pals, locs]) => { setPallets(pals); setLocations(locs) })
    .catch(console.error)
  }, [])

  function getPalletLabel(pallet) {
    const loc = locations.find(l => l.id === pallet.location_id)
    return loc ? `${pallet.pallet_code}  (${loc.label})` : pallet.pallet_code
  }

  async function handleScanPallet() {
    setError(null)
    try {
      const result = await liff.scanCodeV2()
      const val = result.value?.trim()
      if (!val) return
      const code = val.startsWith('PAL:') ? val.replace('PAL:', '') : val
      const found = pallets.find(p => p.pallet_code === code)
      found ? setSelectedPallet(found) : setError(`ไม่พบพาเลท "${code}"`)
    } catch (e) { setError('สแกนไม่สำเร็จ: ' + e.message) }
  }

  async function handleAdd() {
    if (!item.item_code || !item.item_name) return setError('กรุณาเลือกสินค้าก่อน')
    if (!selectedPallet) return setError('กรุณาเลือกพาเลทปลายทาง')
    setLoading(true); setError(null); setSuccess(null)
    try {
      await addItem({ pallet_id: selectedPallet.id, item_code: item.item_code, item_name: item.item_name, qty: Number(qty) })
      setSuccess(`✅ เพิ่ม "${item.item_name}" เข้าพาเลท ${selectedPallet.pallet_code} แล้ว`)
      setItem({ item_code: '', item_name: '' })
      setQty(1)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        {profile && <p style={styles.greeting}>สวัสดี {profile.displayName}</p>}
        <h1 style={styles.title}>เพิ่มสินค้า</h1>
      </div>

      <div style={styles.body}>
        {success && <div style={styles.successBox}>{success}</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* 1. ค้นหาสินค้า */}
        <div style={styles.card}>
          <p style={styles.sectionTitle}>1. ค้นหาสินค้า</p>
          <ItemSearchInput
            value={item}
            onChange={selected => setItem({ item_code: selected.code, item_name: selected.name })}
            onClear={() => setItem({ item_code: '', item_name: '' })}
          />
        </div>

        {/* 2. จำนวน */}
        <div style={styles.card}>
          <p style={styles.sectionTitle}>2. จำนวน</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={styles.qtyBtn}>−</button>
            <input style={{ ...styles.input, width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
              type="number" value={qty} onChange={e => setQty(Number(e.target.value) || 1)} />
            <button onClick={() => setQty(q => q + 1)} style={styles.qtyBtn}>+</button>
          </div>
        </div>

        {/* 3. เลือกพาเลท */}
        <div style={styles.card}>
          <p style={styles.sectionTitle}>3. เลือกพาเลทปลายทาง</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...styles.input, flex: 1 }}
              value={selectedPallet?.id || ''}
              onChange={e => setSelectedPallet(pallets.find(p => p.id === Number(e.target.value)) || null)}>
              <option value="">-- เลือกพาเลท --</option>
              {pallets.map(p => <option key={p.id} value={p.id}>{getPalletLabel(p)}</option>)}
            </select>
            <button onClick={handleScanPallet} style={styles.scanBtn} title="สแกน QR พาเลท">📷</button>
          </div>
          {selectedPallet && <p style={styles.palletSelected}>✅ {getPalletLabel(selectedPallet)}</p>}
          <p style={styles.hint}>📷 กดสแกน QR Code บนพาเลท</p>
        </div>

        <button onClick={handleAdd} style={styles.addBtn} disabled={loading}>
          {loading ? 'กำลังบันทึก...' : '+ เพิ่มสินค้า'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { background: '#fff', padding: '12px 16px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  greeting: { fontSize: 12, color: '#888', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: 700, color: '#1a1a1a' },
  body: { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#555' },
  hint: { fontSize: 11, color: '#aaa' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  scanBtn: { padding: '10px 14px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 20, cursor: 'pointer', flexShrink: 0 },
  palletSelected: { fontSize: 13, color: '#06c755', fontWeight: 600 },
  qtyBtn: { width: 44, height: 44, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 22, cursor: 'pointer', flexShrink: 0 },
  addBtn: { padding: '14px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 4 },
  successBox: { background: '#e6faf0', color: '#0a7a3e', padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500 },
  errorBox: { background: '#fff5f5', color: '#e53e3e', padding: '10px 14px', borderRadius: 10, fontSize: 14 },
}
