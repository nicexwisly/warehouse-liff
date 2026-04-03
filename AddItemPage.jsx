import { useState, useEffect } from 'react'
import liff from '@line/liff'
import { addItem } from './api'
import ItemSearchInput from './ItemSearchInput'
import { theme } from './theme'

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
      await addItem({ pallet_id: selectedPallet.id, item_code: item.item_code, item_name: item.item_name, qty: Number(qty), actor_name: profile?.displayName, actor_user_id: profile?.userId })
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
        <h1 style={styles.title}>Add Item</h1>
        <p style={styles.sub}>เพิ่มสินค้าเข้าสู่พาเลทในสไตล์รายการแบบ Finder</p>
      </div>

      <div style={styles.body}>
        {success && <div style={styles.successBox}>{success}</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.panel}>
          <div style={styles.sectionRow}><span style={styles.sectionIndex}>1</span><p style={styles.sectionTitle}>เลือกสินค้า</p></div>
          <ItemSearchInput
            value={item}
            onChange={selected => setItem({ item_code: selected.code, item_name: selected.name })}
            onClear={() => setItem({ item_code: '', item_name: '' })}
          />
        </div>

        <div style={styles.panel}>
          <div style={styles.sectionRow}><span style={styles.sectionIndex}>2</span><p style={styles.sectionTitle}>จำนวน</p></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={styles.qtyBtn}>−</button>
            <input style={{ ...theme.input, width: 88, textAlign: 'center', fontSize: 18, fontWeight: 700 }} type="number" value={qty} onChange={e => setQty(Number(e.target.value) || 1)} />
            <button onClick={() => setQty(q => q + 1)} style={styles.qtyBtn}>+</button>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.sectionRow}><span style={styles.sectionIndex}>3</span><p style={styles.sectionTitle}>เลือกพาเลทปลายทาง</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              style={{ ...theme.input, flex: 1 }}
              value={selectedPallet?.id || ''}
              onChange={e => setSelectedPallet(pallets.find(p => p.id === Number(e.target.value)) || null)}>
              <option value="">-- เลือกพาเลท --</option>
              {pallets.map(p => <option key={p.id} value={p.id}>{getPalletLabel(p)}</option>)}
            </select>
            <button onClick={handleScanPallet} style={styles.secondaryBtn} title="สแกน QR พาเลท">📷</button>
          </div>
          {selectedPallet && <p style={styles.palletSelected}>✓ {getPalletLabel(selectedPallet)}</p>}
          <p style={styles.hint}>กดสแกน QR Code บนพาเลท หรือเลือกจากรายการ</p>
        </div>

        <button onClick={handleAdd} style={styles.addBtn} disabled={loading}>{loading ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}</button>
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { background: theme.toolbar, borderBottom: `1px solid ${theme.line}`, padding: '14px 16px 12px' },
  greeting: { fontSize: 12, color: theme.textSoft, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: theme.text },
  sub: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  body: { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 },
  panel: { background: theme.panel, borderRadius: 14, border: `1px solid ${theme.line}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: theme.shadowSoft },
  sectionRow: { display: 'flex', alignItems: 'center', gap: 10 },
  sectionIndex: { width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: theme.toolbarStrong, color: theme.textMuted, fontSize: 12, fontWeight: 700 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: theme.text },
  hint: { fontSize: 11, color: theme.textSoft },
  secondaryBtn: { ...theme.button, padding: '10px 12px', fontSize: 18, flexShrink: 0 },
  palletSelected: { fontSize: 13, color: theme.blue, fontWeight: 600 },
  qtyBtn: { ...theme.button, width: 44, height: 44, fontSize: 22, flexShrink: 0 },
  addBtn: { ...theme.primaryButton, padding: '14px', fontWeight: 700, fontSize: 16, marginTop: 2 },
  successBox: { background: theme.greenSoft, color: '#208142', padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 500, border: `1px solid ${theme.lineSoft}` },
  errorBox: { background: theme.redSoft, color: theme.red, padding: '10px 14px', borderRadius: 12, fontSize: 14, border: `1px solid ${theme.lineSoft}` },
}
