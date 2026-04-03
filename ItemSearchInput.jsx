import { useState, useRef } from 'react'
import BarcodeScanner from './BarcodeScanner'
import { theme } from './theme'

const BASE = import.meta.env.VITE_API_URL

export default function ItemSearchInput({ value, onChange, onClear }) {
  const [query, setQuery] = useState(value?.item_code || '')
  const [suggestions, setSuggestions] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const debounceRef = useRef(null)

  function handleInput(val) {
    setQuery(val)
    if (value?.item_name) onClear?.()
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
      const res = await fetch(`${BASE}/master/items?q=${encodeURIComponent(val)}&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        setQuery(data[0].code)
        setSuggestions([])
        onChange({ code: data[0].code, name: data[0].name })
      } else {
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
      {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input style={styles.input} placeholder="พิมพ์ชื่อ, รหัสสินค้า หรือ barcode..." value={query} onChange={e => handleInput(e.target.value)} autoComplete="off" />
            {suggestions.length > 0 && (
              <div style={styles.dropdown}>
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectItem(s)} style={styles.dropItem}>
                    <span style={styles.dropCode}>{s.code}</span>
                    <span style={styles.dropName}>{s.name}</span>
                    {s.barcodes?.length > 0 && <span style={styles.dropBarcode}>Barcode {s.barcodes[0]}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowScanner(true)} style={styles.scanBtn} disabled={scanning} title="สแกน barcode">{scanning ? '⏳' : '📷'}</button>
        </div>

        {value?.item_name && (
          <div style={styles.selectedBox}>
            <div>
              <p style={styles.selectedName}>{value.item_name}</p>
              <p style={styles.selectedCode}>{value.item_code}</p>
            </div>
            <button onClick={handleClear} style={styles.clearBtn}>✕</button>
          </div>
        )}

        <p style={styles.hint}>ค้นหาได้ด้วย: ชื่อสินค้า · รหัสสินค้า · barcode · หรือกดสแกน</p>
      </div>
    </>
  )
}

const styles = {
  input: theme.input,
  scanBtn: { ...theme.button, padding: '10px 14px', fontSize: 18, flexShrink: 0 },
  dropdown: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, boxShadow: theme.shadowSoft, zIndex: 50, maxHeight: 240, overflowY: 'auto' },
  dropItem: { padding: '10px 12px', borderBottom: `1px solid ${theme.lineSoft}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 },
  dropCode: { fontSize: 11, color: theme.textSoft, fontWeight: 600 },
  dropName: { fontSize: 13, color: theme.text },
  dropBarcode: { fontSize: 11, color: theme.textMuted },
  selectedBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.blueSoft, padding: '10px 12px', borderRadius: 12, border: `1px solid rgba(10,132,255,0.14)` },
  selectedName: { fontSize: 14, fontWeight: 600, color: theme.text },
  selectedCode: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  clearBtn: { background: 'none', border: 'none', color: theme.textMuted, fontSize: 14, cursor: 'pointer', padding: '4px 8px' },
  hint: { fontSize: 11, color: theme.textSoft },
}
