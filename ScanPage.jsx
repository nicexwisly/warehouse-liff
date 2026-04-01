import { useState, useEffect, useRef } from 'react'
import liff from '@line/liff'
import { getPalletDetail, addItem, getLocations } from './api'

const BASE = import.meta.env.VITE_API_URL

export default function ScanPage() {
  const [mode, setMode] = useState(null)
  const [pallet, setPallet] = useState(null)
  const [locationLabel, setLocationLabel] = useState(null)
  const [form, setForm] = useState({ item_code: '', item_name: '', qty: 1 })
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  // Autocomplete — ค้นหา master เมื่อพิมพ์ item_code
  function handleCodeChange(val) {
    setForm(f => ({ ...f, item_code: val, item_name: '' }))
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 1) return
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/master/items?q=${encodeURIComponent(val)}&limit=8`)
        const data = await res.json()
        setSuggestions(data)
      } catch {}
    }, 300)
  }

  function selectSuggestion(item) {
    setForm(f => ({ ...f, item_code: item.code, item_name: item.name }))
    setSuggestions([])
  }

  async function handleScan() {
    try {
      const result = await liff.scanCodeV2()
      const value = result.value
      if (value.startsWith('PAL:')) {
        const code = value.replace('PAL:', '')
        setLoading(true)
        const res = await fetch(`${BASE}/pallets`)
        const pallets = await res.json()
        const found = pallets.find(p => p.pallet_code === code)
        if (!found) {
          setError(`ไม่พบพาเลท "${code}" ในระบบ`)
          setLoading(false)
          return
        }
        const detail = await getPalletDetail(found.id)
        setPallet(detail)
        setMode('pallet')
      } else if (value.startsWith('LOC:')) {
        setLocationLabel(value.replace('LOC:', ''))
        setMode('location')
      } else {
        setError('QR Code ไม่ถูกต้อง')
      }
    } catch (e) {
      setError('ไม่สามารถสแกนได้: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddItem() {
    if (!form.item_code || !form.item_name) {
      setError('กรุณาเลือกสินค้าจากรายการ')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addItem({ ...form, pallet_id: pallet.pallet.id, qty: Number(form.qty) })
      setSuccess(`เพิ่ม "${form.item_name}" สำเร็จแล้ว`)
      setForm({ item_code: '', item_name: '', qty: 1 })
      const detail = await getPalletDetail(pallet.pallet.id)
      setPallet(detail)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setMode(null); setPallet(null); setLocationLabel(null)
    setSuccess(null); setError(null)
    setForm({ item_code: '', item_name: '', qty: 1 })
    setSuggestions([])
  }

  // หน้าหลัก
  if (!mode) return (
    <div style={styles.page}>
      <h1 style={styles.title}>สแกน QR Code</h1>
      <p style={styles.sub}>สแกน QR ที่ติดพาเลท หรือ QR ที่ติดล็อค</p>
      <button onClick={handleScan} style={styles.scanBtn} disabled={loading}>
        <span style={{ fontSize: 48 }}>📷</span>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{loading ? 'กำลังโหลด...' : 'เปิดกล้องสแกน'}</span>
      </button>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  )

  // หน้าพาเลท
  if (mode === 'pallet' && pallet) return (
    <div style={styles.page}>
      <button onClick={reset} style={styles.back}>← กลับ</button>
      <div style={styles.palletHeader}>
        <span style={styles.palletCode}>{pallet.pallet.pallet_code}</span>
        <span style={styles.palletLoc}>{pallet.location?.label}</span>
      </div>

      {success && <p style={styles.successMsg}>{success}</p>}
      {error && <p style={styles.error}>{error}</p>}

      {/* ฟอร์มเพิ่มสินค้า */}
      <div style={styles.formCard}>
        <p style={styles.formTitle}>เพิ่มสินค้าเข้าพาเลทนี้</p>

        {/* Item code + autocomplete */}
        <div style={{ position: 'relative' }}>
          <input
            style={styles.input}
            placeholder="พิมพ์รหัสหรือชื่อสินค้า..."
            value={form.item_code}
            onChange={e => handleCodeChange(e.target.value)}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div style={styles.dropdown}>
              {suggestions.map((s, i) => (
                <div key={i} onClick={() => selectSuggestion(s)} style={styles.dropdownItem}>
                  <span style={styles.dropCode}>{s.code}</span>
                  <span style={styles.dropName}>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ชื่อสินค้าที่เลือก */}
        {form.item_name ? (
          <div style={styles.selectedItem}>
            <span style={{ fontSize: 13 }}>✅</span>
            <span style={{ fontSize: 14, color: '#1a1a1a' }}>{form.item_name}</span>
          </div>
        ) : null}

        {/* จำนวน */}
        <input
          style={styles.input}
          placeholder="จำนวน"
          type="number"
          value={form.qty}
          onChange={e => setForm({ ...form, qty: e.target.value })}
        />

        <button onClick={handleAddItem} style={styles.addBtn} disabled={loading}>
          {loading ? 'กำลังบันทึก...' : '+ เพิ่มสินค้า'}
        </button>
      </div>

      {/* รายการในพาเลท */}
      <p style={styles.sectionTitle}>สินค้าในพาเลทนี้ ({pallet.items.length} รายการ)</p>
      {pallet.items.length === 0 && <p style={styles.empty}>ยังไม่มีสินค้า</p>}
      {pallet.items.map(item => (
        <div key={item.id} style={styles.itemRow}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{item.item_name}</p>
            <p style={{ fontSize: 12, color: '#888' }}>{item.item_code}</p>
          </div>
          <span style={styles.qtyBadge}>{item.qty}</span>
        </div>
      ))}
    </div>
  )

  // หน้าล็อค
  if (mode === 'location') return (
    <div style={styles.page}>
      <button onClick={reset} style={styles.back}>← กลับ</button>
      <div style={styles.locCard}>
        <span style={{ fontSize: 48 }}>📍</span>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#06c755' }}>{locationLabel}</p>
        <p style={{ color: '#888', fontSize: 14 }}>ตำแหน่งนี้ในเต้นท์</p>
      </div>
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' },
  sub: { fontSize: 14, color: '#888', marginBottom: 32 },
  scanBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '40px 0', background: '#fff', border: '2px dashed #06c755', borderRadius: 16, cursor: 'pointer', color: '#1a1a1a' },
  error: { color: '#e53e3e', fontSize: 13, marginTop: 12 },
  successMsg: { color: '#06c755', fontSize: 13, marginBottom: 12, background: '#e6faf0', padding: '8px 12px', borderRadius: 8 },
  back: { background: 'none', border: 'none', color: '#06c755', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0 },
  palletHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 16 },
  palletCode: { fontSize: 18, fontWeight: 700 },
  palletLoc: { fontSize: 14, fontWeight: 700, color: '#06c755', background: '#e6faf0', padding: '4px 10px', borderRadius: 8 },
  formCard: { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  formTitle: { fontWeight: 600, fontSize: 15, color: '#1a1a1a' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 240, overflowY: 'auto' },
  dropdownItem: { padding: '10px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 },
  dropCode: { fontSize: 12, color: '#888', fontWeight: 600 },
  dropName: { fontSize: 14, color: '#1a1a1a' },
  selectedItem: { display: 'flex', alignItems: 'center', gap: 8, background: '#e6faf0', padding: '8px 12px', borderRadius: 8 },
  addBtn: { padding: '12px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: 4 },
  sectionTitle: { fontWeight: 600, fontSize: 14, color: '#444', marginBottom: 8 },
  empty: { color: '#aaa', fontSize: 14, textAlign: 'center', padding: '20px 0' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 6 },
  qtyBadge: { fontSize: 15, fontWeight: 700, color: '#444', background: '#f0f0f0', padding: '4px 12px', borderRadius: 8 },
  locCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', borderRadius: 16, padding: '48px 0', marginTop: 16 },
}
