import { useState, useRef, useEffect } from 'react'
import liff from '@line/liff'
import { addItem, getLocations } from './api'

const BASE = import.meta.env.VITE_API_URL

export default function AddItemPage({ profile }) {
  const [form, setForm] = useState({ item_code: '', item_name: '', qty: 1 })
  const [suggestions, setSuggestions] = useState([])
  const [pallets, setPallets] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedPallet, setSelectedPallet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    // โหลด pallets + locations ตอนเปิดหน้า
    Promise.all([
      fetch(`${BASE}/pallets`).then(r => r.json()),
      fetch(`${BASE}/locations`).then(r => r.json()),
    ]).then(([pals, locs]) => {
      setPallets(pals)
      setLocations(locs)
    }).catch(console.error)
  }, [])

  function getPalletLabel(pallet) {
    const loc = locations.find(l => l.id === pallet.location_id)
    return loc ? `${pallet.pallet_code} (${loc.label})` : pallet.pallet_code
  }

  // Autocomplete
  function handleCodeChange(val) {
    setForm(f => ({ ...f, item_code: val, item_name: '' }))
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) return
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/master/items?q=${encodeURIComponent(val)}&limit=8`)
        setSuggestions(await res.json())
      } catch {}
    }, 300)
  }

  function selectSuggestion(item) {
    setForm(f => ({ ...f, item_code: item.code, item_name: item.name }))
    setSuggestions([])
  }

  // Scan barcode ด้วย LIFF
  async function handleScan() {
    try {
      const result = await liff.scanCodeV2()
      const val = result.value
      // ถ้าเป็น PAL: → เลือกพาเลทอัตโนมัติ
      if (val.startsWith('PAL:')) {
        const code = val.replace('PAL:', '')
        const found = pallets.find(p => p.pallet_code === code)
        if (found) {
          setSelectedPallet(found)
          setSuccess(`เลือกพาเลท ${code} แล้ว`)
          return
        } else {
          setError(`ไม่พบพาเลท "${code}" ในระบบ`)
          return
        }
      }
      // ไม่ใช่ PAL: → ค้นหาเป็น barcode/item
      handleCodeChange(val)
    } catch (e) {
      setError('สแกนไม่สำเร็จ: ' + e.message)
    }
  }

  async function handleAdd() {
    if (!form.item_code || !form.item_name) {
      setError('กรุณาเลือกสินค้าจาก dropdown')
      return
    }
    if (!selectedPallet) {
      setError('กรุณาเลือกพาเลทปลายทาง')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addItem({
        pallet_id: selectedPallet.id,
        item_code: form.item_code,
        item_name: form.item_name,
        qty: Number(form.qty),
      })
      setSuccess(`✅ เพิ่ม "${form.item_name}" เข้าพาเลท ${selectedPallet.pallet_code} แล้ว`)
      setForm({ item_code: '', item_name: '', qty: 1 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const palletLabel = selectedPallet ? getPalletLabel(selectedPallet) : ''

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        {profile && <p style={styles.greeting}>สวัสดี {profile.displayName}</p>}
        <h1 style={styles.title}>เพิ่มสินค้า</h1>
      </div>

      <div style={styles.body}>
        {success && <div style={styles.successBox}>{success}</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Section: ค้นหาสินค้า */}
        <div style={styles.card}>
          <p style={styles.sectionTitle}>1. ค้นหาสินค้า</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                style={styles.input}
                placeholder="พิมพ์รหัส ชื่อ หรือ barcode..."
                value={form.item_code}
                onChange={e => handleCodeChange(e.target.value)}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div style={styles.dropdown}>
                  {suggestions.map((s, i) => (
                    <div key={i} onClick={() => selectSuggestion(s)} style={styles.dropItem}>
                      <span style={styles.dropCode}>{s.code}</span>
                      <span style={styles.dropName}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleScan} style={styles.scanBtn} title="สแกน QR/Barcode">
              📷
            </button>
          </div>

          {form.item_name ? (
            <div style={styles.selectedBox}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{form.item_name}</p>
                <p style={{ fontSize: 12, color: '#888' }}>{form.item_code}</p>
              </div>
              <button onClick={() => setForm({ item_code: '', item_name: '', qty: 1 })} style={styles.clearBtn}>✕</button>
            </div>
          ) : null}
        </div>

        {/* Section: จำนวน */}
        <div style={styles.card}>
          <p style={styles.sectionTitle}>2. จำนวน</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setForm(f => ({ ...f, qty: Math.max(1, f.qty - 1) }))} style={styles.qtyBtn}>−</button>
            <input
              style={{ ...styles.input, width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
              type="number"
              value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) || 1 }))}
            />
            <button onClick={() => setForm(f => ({ ...f, qty: f.qty + 1 }))} style={styles.qtyBtn}>+</button>
          </div>
        </div>

        {/* Section: เลือกพาเลท */}
        <div style={styles.card}>
          <p style={styles.sectionTitle}>3. เลือกพาเลทปลายทาง</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              style={{ ...styles.input, flex: 1 }}
              value={selectedPallet?.id || ''}
              onChange={e => {
                const p = pallets.find(p => p.id === Number(e.target.value))
                setSelectedPallet(p || null)
              }}
            >
              <option value="">-- เลือกพาเลท --</option>
              {pallets.map(p => {
                const loc = locations.find(l => l.id === p.location_id)
                return (
                  <option key={p.id} value={p.id}>
                    {p.pallet_code} {loc ? `(${loc.label})` : ''}
                  </option>
                )
              })}
            </select>
            <button onClick={handleScan} style={styles.scanBtn} title="สแกน QR พาเลท">
              📷
            </button>
          </div>
          {selectedPallet && (
            <p style={{ fontSize: 13, color: '#06c755', marginTop: 6, fontWeight: 600 }}>
              ✅ {palletLabel}
            </p>
          )}
        </div>

        {/* ปุ่มเพิ่ม */}
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
  input: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  scanBtn: { padding: '10px 14px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 220, overflowY: 'auto' },
  dropItem: { padding: '10px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 },
  dropCode: { fontSize: 11, color: '#888', fontWeight: 600 },
  dropName: { fontSize: 13, color: '#1a1a1a' },
  selectedBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e6faf0', padding: '10px 12px', borderRadius: 8 },
  clearBtn: { background: 'none', border: 'none', color: '#888', fontSize: 14, cursor: 'pointer' },
  qtyBtn: { width: 44, height: 44, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 22, cursor: 'pointer', flexShrink: 0 },
  addBtn: { padding: '14px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 4 },
  successBox: { background: '#e6faf0', color: '#0a7a3e', padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500 },
  errorBox: { background: '#fff5f5', color: '#e53e3e', padding: '10px 14px', borderRadius: 10, fontSize: 14 },
}
