import { useState, useRef } from 'react'
import BarcodeScanner from './BarcodeScanner'

const BASE = import.meta.env.VITE_API_URL

/**
 * ItemSearchInput — ช่องค้นหาสินค้า ใช้ร่วมกันทุกหน้า
 * รองรับ: พิมพ์ชื่อ / รหัสสินค้า / barcode / สแกน barcode
 *
 * Props:
 *   value        { item_code, item_name }
 *   onChange     (item: { code, name }) => void
 *   onClear      () => void
 */
export default function ItemSearchInput({ value, onChange, onClear }) {
  const [query, setQuery] = useState(value?.item_code || '')
  const [suggestions, setSuggestions] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const debounceRef = useRef(null)

  function handleInput(val) {
    setQuery(val)
    if (value?.item_name) onClear?.()   // reset ถ้าพิมพ์ใหม่
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

  function selectItem(item) {
    setQuery(item.code)
    setSuggestions([])
    onChange({ code: item.code, name: item.name })
  }

  async function handleScanResult(val) {
    setShowScanner(false)
    setScanning(true)
    try {
      // barcode ตัวเลข → ค้นใน master ก่อน
      const res = await fetch(`${BASE}/master/items?q=${encodeURIComponent(val)}&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        setQuery(data[0].code)
        setSuggestions([])
        onChange({ code: data[0].code, name: data[0].name })
      } else {
        // ไม่พบ → ใส่ค่า raw ไว้ให้พิมพ์ชื่อต่อเอง
        setQuery(val)
        onChange({ code: val, name: '' })
      }
    } catch {}
    setScanning(false)
  }

  function handleClear() {
    setQuery('')
    setSuggestions([])
    onClear?.()
  }

  return (
    <>
      {showScanner && (
        <BarcodeScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Input row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              style={styles.input}
              placeholder="พิมพ์ชื่อ, รหัสสินค้า หรือ barcode..."
              value={query}
              onChange={e => handleInput(e.target.value)}
              autoComplete="off"
            />
            {/* Dropdown */}
            {suggestions.length > 0 && (
              <div style={styles.dropdown}>
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectItem(s)} style={styles.dropItem}>
                    <span style={styles.dropCode}>{s.code}</span>
                    <span style={styles.dropName}>{s.name}</span>
                    {s.barcodes?.length > 0 && (
                      <span style={styles.dropBarcode}>🔖 {s.barcodes[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            style={styles.scanBtn}
            disabled={scanning}
            title="สแกน barcode"
          >
            {scanning ? '⏳' : '📷'}
          </button>
        </div>

        {/* Selected item display */}
        {value?.item_name && (
          <div style={styles.selectedBox}>
            <div>
              <p style={styles.selectedName}>{value.item_name}</p>
              <p style={styles.selectedCode}>{value.item_code}</p>
            </div>
            <button onClick={handleClear} style={styles.clearBtn}>✕</button>
          </div>
        )}

        <p style={styles.hint}>ค้นหาได้ด้วย: ชื่อสินค้า · รหัสสินค้า · barcode · หรือกด 📷 สแกน</p>
      </div>
    </>
  )
}

const styles = {
  input: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  scanBtn: { padding: '10px 14px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 20, cursor: 'pointer', flexShrink: 0 },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 240, overflowY: 'auto' },
  dropItem: { padding: '10px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 },
  dropCode: { fontSize: 11, color: '#888', fontWeight: 600 },
  dropName: { fontSize: 13, color: '#1a1a1a' },
  dropBarcode: { fontSize: 11, color: '#aaa' },
  selectedBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e6faf0', padding: '10px 12px', borderRadius: 8 },
  selectedName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  selectedCode: { fontSize: 12, color: '#888', marginTop: 2 },
  clearBtn: { background: 'none', border: 'none', color: '#888', fontSize: 14, cursor: 'pointer', padding: '4px 8px' },
  hint: { fontSize: 11, color: '#aaa' },
}
