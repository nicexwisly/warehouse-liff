import { useMemo, useState } from 'react'
import { searchItems, deductItem } from './api'
import BarcodeScanner from './BarcodeScanner'
import { theme } from './theme'

const BASE = import.meta.env.VITE_API_URL

function parseContainerLabel(label = '') {
  const match = label.match(/^CON(\d+)-([A-Z])-(\d{1,2})$/i)
  if (!match) return null

  return {
    containerNo: Number(match[1]),
    rowLetter: match[2].toUpperCase(),
    slot: Number(match[3]),
    label,
  }
}

function parseTentLabel(label = '') {
  const match = label.match(/^([A-Z])-?(\d{1,2})-(\d+)$/i)
  if (!match) return null
  return {
    row: match[1].toUpperCase(),
    slot: Number(match[2]),
    level: Number(match[3]),
    label,
  }
}

function buildLocationMap(items) {
  const containerHighlights = {}
  const tentHighlights = {}
  const summaryMap = {}

  items.forEach(item => {
    const qty = Number(item.qty) || 0
    const label = item.location_label || '-'

    summaryMap[label] = (summaryMap[label] || 0) + qty

    const con = parseContainerLabel(label)
    if (con) {
      const key = `${con.containerNo}-${con.rowLetter}-${con.slot}`
      containerHighlights[key] = {
        qty: (containerHighlights[key]?.qty || 0) + qty,
        labels: [...new Set([...(containerHighlights[key]?.labels || []), label])],
      }
      return
    }

    const tent = parseTentLabel(label)
    if (tent) {
      const key = `${tent.row}-${tent.slot}-${tent.level}`
      tentHighlights[key] = {
        qty: (tentHighlights[key]?.qty || 0) + qty,
        label,
      }
    }
  })

  const summary = Object.entries(summaryMap).map(([label, qty]) => ({ label, qty }))

  return { containerHighlights, tentHighlights, summary }
}

function ContainerCell({ number, activeData }) {
  const active = !!activeData
  const codeText = activeData?.labels?.[0] || '+'

  return (
    <div style={{ ...mapStyles.containerCell, ...(active ? mapStyles.containerCellActive : null) }}>
      <div style={mapStyles.containerNumber}>{number}</div>
      <div style={mapStyles.containerCode}>{codeText}</div>
      <div style={{ ...mapStyles.containerBottom, ...(active ? mapStyles.containerBottomActive : null) }}>
        {active ? activeData.qty : '+'}
      </div>
    </div>
  )
}

function ContainerMapSection({ highlights }) {
  const containerNos = [3, 2, 1]
  const groupLabels = containerNos.map(n => `ตู้คอนที่ ${n}`)

  const rowPairs = [
    { leftSlot: 4, rightSlot: 4, leftNumber: 4, rightNumber: 8 },
    { leftSlot: 3, rightSlot: 3, leftNumber: 3, rightNumber: 7 },
    { leftSlot: 2, rightSlot: 2, leftNumber: 2, rightNumber: 6 },
    { leftSlot: 1, rightSlot: 1, leftNumber: 1, rightNumber: 5 },
  ]

  return (
    <div style={mapStyles.sectionCard}>
      <div style={mapStyles.sectionHeader}>
        <div style={mapStyles.sectionTitle}>Container ST129</div>
        <div style={mapStyles.sectionHint}>ไฮไลท์ทุกจุดที่พบ</div>
      </div>

      <div style={mapStyles.containerFrame}>
        <div style={mapStyles.containerColumns}>
          {containerNos.map((containerNo, index) => (
            <div key={containerNo} style={mapStyles.containerColumn}>
              <div style={mapStyles.containerZoneGrid}>
                {rowPairs.map(pair => (
                  <div key={`${containerNo}-${pair.leftSlot}-${pair.rightSlot}`} style={{ display: 'contents' }}>
                    <ContainerCell
                      number={pair.leftNumber}
                      activeData={highlights[`${containerNo}-A-${pair.leftSlot}`]}
                    />
                    <ContainerCell
                      number={pair.rightNumber}
                      activeData={highlights[`${containerNo}-B-${pair.rightSlot}`]}
                    />
                  </div>
                ))}
              </div>
              <div style={mapStyles.zoneLabel}>{groupLabels[index] || String(containerNo)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TentSection({ highlights }) {
  const rows = [...new Set(Object.keys(highlights).map(key => key.split('-')[0]))].sort()
  const slots = [...new Set(Object.keys(highlights).map(key => Number(key.split('-')[1])))].sort((a, b) => a - b)
  const levels = [...new Set(Object.keys(highlights).map(key => Number(key.split('-')[2])))].sort((a, b) => a - b)

  if (rows.length === 0 || slots.length === 0 || levels.length === 0) return null

  return (
    <div style={mapStyles.sectionCard}>
      <div style={mapStyles.sectionHeader}>
        <div style={mapStyles.sectionTitle}>พาเลท / เต็นท์</div>
        <div style={mapStyles.sectionHint}>ไฮไลท์ทุกจุดที่พบ</div>
      </div>

      <div style={mapStyles.tentScroll}>
        <div style={{ ...mapStyles.tentGrid, gridTemplateColumns: `42px repeat(${slots.length}, minmax(52px, 1fr))` }}>
          <div />
          {slots.map(slot => <div key={`slot-${slot}`} style={mapStyles.tentColHeader}>ล็อค {slot}</div>)}
          {rows.map(row => (
            <div key={`row-${row}`} style={{ display: 'contents' }}>
              <div style={mapStyles.tentRowHeader}>แถว {row}</div>
              {slots.map(slot => (
                <div key={`${row}-${slot}`} style={mapStyles.tentSlotStack}>
                  {levels.map(level => {
                    const data = highlights[`${row}-${slot}-${level}`]
                    return (
                      <div key={`${row}-${slot}-${level}`} style={{ ...mapStyles.tentCell, ...(data ? mapStyles.tentCellActive : null) }}>
                        <span style={mapStyles.tentLevelText}>ชั้น {level}</span>
                        {data ? <span style={mapStyles.tentQty}>{data.qty}</span> : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummarySection({ summary }) {
  return (
    <div style={mapStyles.sectionCard}>
      <div style={mapStyles.sectionTitle}>สรุปตำแหน่ง</div>
      <div style={mapStyles.summaryList}>
        {summary.map((item, index) => (
          <div key={`${item.label}-${index}`} style={mapStyles.summaryRow}>
            <span style={mapStyles.summaryLabel}>{item.label}</span>
            <span style={mapStyles.summaryQty}>{item.qty} ชิ้น</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchMapModal({ results, onClose }) {
  const { containerHighlights, tentHighlights, summary } = useMemo(() => buildLocationMap(results), [results])
  const hasContainers = Object.keys(containerHighlights).length > 0
  const hasTent = Object.keys(tentHighlights).length > 0

  return (
    <div style={mapStyles.overlay} onClick={onClose}>
      <div style={mapStyles.modalCard} onClick={e => e.stopPropagation()}>
        <div style={mapStyles.modalHeader}>
          <div>
            <p style={mapStyles.modalEyebrow}>Map Preview</p>
            <h3 style={mapStyles.modalTitle}>ตำแหน่งสินค้า</h3>
          </div>
          <button onClick={onClose} style={mapStyles.closeBtn}>ปิด</button>
        </div>

        <div style={mapStyles.modalBody}>
          {hasContainers && <ContainerMapSection highlights={containerHighlights} />}
          {hasTent && <TentSection highlights={tentHighlights} />}
          <SummarySection summary={summary} />
        </div>
      </div>
    </div>
  )
}

function SearchSummary({ results, query, onOpenMap }) {
  const totalQty = results.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  const uniqueLocations = new Set(results.map(item => item.location_label).filter(Boolean)).size

  return (
    <>
      <div style={styles.resultsHeader}>
        <div>
          <h2 style={styles.resultsTitle}>ผลการค้นหา</h2>
          <p style={styles.resultsSub}>{query || 'รายการสินค้า'}</p>
        </div>
        <button onClick={onOpenMap} style={styles.mapBtnTop}>ดูแผนที่</button>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>จำนวนรายการ</div>
          <div style={styles.summaryValue}>{uniqueLocations} location</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>จำนวนรวม</div>
          <div style={styles.summaryValue}>{totalQty} ชิ้น</div>
        </div>
      </div>
    </>
  )
}

function groupSearchResults(items) {
  const grouped = {}

  items.forEach(item => {
    const key = [
      item.item_code || '',
      item.item_name || '',
      item.pallet_code || '',
      item.location_label || '',
    ].join('::')

    if (!grouped[key]) {
      grouped[key] = {
        ...item,
        grouped_key: key,
        qty: 0,
        sourceItems: [],
      }
    }

    grouped[key].qty += Number(item.qty) || 0
    grouped[key].sourceItems.push({
      id: item.id,
      qty: Number(item.qty) || 0,
    })
  })

  return Object.values(grouped)
}

function ResultCard({ item, onDeduct }) {
  return (
    <div style={styles.resultCard}>
      <div style={styles.resultCardTop}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.itemCode}>ITEM {item.item_code}</div>
          <div style={styles.itemName}>{item.item_name}</div>
          <div style={styles.itemMeta}>พาเลท {item.pallet_code}</div>
        </div>

        <div style={styles.qtyWrap}>
          <div style={styles.qtyValue}>{item.qty}</div>
          <div style={styles.qtyUnit}>ชิ้น</div>
        </div>
      </div>

      <div style={styles.resultCardBottom}>
        <div style={styles.resultCardInfo}>
          <span style={styles.locationBadge}>{item.location_label}</span>
          <span style={styles.stockText}>คงเหลือ {item.qty} ชิ้น</span>
        </div>

        <button onClick={() => onDeduct(item)} style={styles.pickBtn}>หยิบออก</button>
      </div>
    </div>
  )
}

export default function SearchPage({ profile }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)

  async function handleSearch(query) {
    const val = (query ?? q).trim()
    if (!val) return
    setLoading(true)
    try {
      const items = await searchItems(val)
      setResults(groupSearchResults(items))
      setSearched(true)
      setShowMapModal(false)
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
  if (qty > Number(item.qty || 0)) return alert(`จำนวนเกินคงเหลือ (${item.qty})`)

  try {
    let remaining = qty
    let lastMessage = 'หยิบสินค้าออกเรียบร้อย'

    const sourceItems = [...(item.sourceItems || [])]
      .filter(source => Number(source.qty) > 0)

    for (const source of sourceItems) {
      if (remaining <= 0) break

      const deductQty = Math.min(remaining, Number(source.qty || 0))
      if (deductQty <= 0) continue

      const res = await deductItem(source.id, {
        qty: deductQty,
        actor_name: profile?.displayName,
        actor_user_id: profile?.userId,
      })

      lastMessage = res?.message || lastMessage
      remaining -= deductQty
    }

    if (remaining > 0) {
      throw new Error('ไม่สามารถหักสินค้าได้ครบตามจำนวนที่ต้องการ')
    }

    alert(lastMessage)

    const refreshed = await searchItems(q.trim())
    setResults(groupSearchResults(refreshed))
  } catch (e) {
    alert(e.message)
  }
}

  return (
    <>
      {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      {showMapModal && results.length > 0 && <SearchMapModal results={results} onClose={() => setShowMapModal(false)} />}

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
            placeholder='Search items...'
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          <button onClick={() => setShowScanner(true)} style={styles.secondaryBtn} title='สแกน barcode'>📷</button>
          <button onClick={() => handleSearch()} style={styles.primaryBtn} disabled={loading}>
            {loading ? '...' : 'ค้นหา'}
          </button>
        </div>

        <div style={styles.body}>
          {searched && !loading && results.length > 0 && (
            <SearchSummary results={results} query={q.trim()} onOpenMap={() => setShowMapModal(true)} />
          )}

          {searched && !loading && results.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyTitle}>ไม่พบสินค้านี้ในระบบ</div>
              <div style={styles.emptyText}>ลองค้นหาด้วยชื่อสินค้า รหัสสินค้า หรือ barcode อื่น</div>
            </div>
          ) : null}

          <div style={styles.resultsList}>
            {results.map(item => (
              <ResultCard key={item.grouped_key || item.id} item={item} onDeduct={handleDeduct} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#f3f4f6',
  },
  header: {
    background: theme.toolbar,
    borderBottom: `1px solid ${theme.line}`,
    padding: '14px 16px 12px',
  },
  greeting: { fontSize: 12, color: theme.textSoft, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 2 },
  sub: { fontSize: 13, color: theme.textMuted },
  toolbar: {
    display: 'flex',
    gap: 8,
    padding: 14,
    background: theme.window,
    borderBottom: `1px solid ${theme.lineSoft}`,
  },
  input: { ...theme.input, flex: 1 },
  secondaryBtn: { ...theme.button, padding: '10px 12px', fontSize: 18 },
  primaryBtn: { ...theme.primaryButton, padding: '10px 16px', fontWeight: 600, fontSize: 14 },
  body: { flex: 1, overflowY: 'auto', padding: 14 },
  resultsHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.1,
  },
  resultsSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  mapBtnTop: {
    border: 'none',
    borderRadius: 12,
    background: '#0f172a',
    color: '#fff',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(15,23,42,0.14)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    background: '#fff',
    border: '1px solid #dbe2ea',
    borderRadius: 18,
    padding: '14px 14px 12px',
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
  },
  summaryLabel: { fontSize: 12, color: '#94a3b8' },
  summaryValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1,
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  resultCard: {
    background: '#fff',
    border: '1px solid #dbe2ea',
    borderRadius: 24,
    padding: 16,
    boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
  },
  resultCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCode: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.04em',
  },
  itemName: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#94a3b8',
  },
  qtyWrap: {
    minWidth: 68,
    padding: '10px 10px 8px',
    borderRadius: 18,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1,
  },
  qtyUnit: {
    marginTop: 4,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
  },
  resultCardBottom: {
    marginTop: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultCardInfo: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start',
  },
  locationBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#edf6ff',
    color: '#2563eb',
    border: '1px solid rgba(37,99,235,0.14)',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    maxWidth: '100%',
  },
  stockText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
  },
  pickBtn: {
    border: 'none',
    borderRadius: 16,
    background: '#ef2f2f',
    color: '#fff',
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 800,
    boxShadow: '0 6px 12px rgba(239,47,47,0.16)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  emptyCard: {
    background: '#fff',
    border: '1px solid #dbe2ea',
    borderRadius: 22,
    padding: '24px 18px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
}

const mapStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20,20,24,0.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  modalCard: {
    width: 'min(100%, 420px)',
    maxHeight: 'calc(100vh - 24px)',
    overflow: 'hidden',
    borderRadius: 24,
    background: theme.window,
    border: `1px solid ${theme.line}`,
    boxShadow: theme.shadow,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    padding: '12px 16px 10px',
    borderBottom: `1px solid ${theme.lineSoft}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalEyebrow: { fontSize: 11, color: theme.textSoft, marginBottom: 2 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: theme.text },
  closeBtn: {
    ...theme.button,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    borderRadius: 999,
    background: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  modalBody: { padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionCard: {
    background: theme.panel,
    border: `1px solid ${theme.lineSoft}`,
    borderRadius: 22,
    padding: 14,
    boxShadow: theme.shadowSoft,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: theme.text },
  sectionHint: { fontSize: 11, color: theme.textSoft },
  containerFrame: {
    borderRadius: 20,
    border: `1px solid ${theme.lineSoft}`,
    background: '#f8f8fa',
    padding: 8,
  },
  containerColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  containerColumn: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  containerZoneGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  containerCell: {
    minHeight: 76,
    borderRadius: 16,
    border: `1px solid ${theme.lineSoft}`,
    background: theme.window,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 6px 6px',
  },
  containerCellActive: {
    background: '#f3faf4',
    border: '1px solid rgba(34,197,94,0.28)',
  },
  containerNumber: { fontSize: 20, fontWeight: 700, lineHeight: 1, color: theme.text },
  containerCode: {
    fontSize: 7,
    color: theme.textSoft,
    textAlign: 'center',
    lineHeight: 1.15,
    minHeight: 16,
    wordBreak: 'break-word',
  },
  containerBottom: { fontSize: 18, fontWeight: 500, lineHeight: 1, color: '#c2c7d0' },
  containerBottomActive: { color: '#16a34a', fontWeight: 700 },
  zoneLabel: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
    fontWeight: 700,
    color: theme.textMuted,
  },
  tentScroll: { overflowX: 'auto' },
  tentGrid: { display: 'grid', gap: 6, minWidth: 250 },
  tentColHeader: { textAlign: 'center', fontSize: 11, color: theme.textSoft, fontWeight: 600 },
  tentRowHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: theme.textMuted, background: theme.toolbar, borderRadius: 10, border: `1px solid ${theme.lineSoft}` },
  tentSlotStack: { display: 'flex', flexDirection: 'column', gap: 4 },
  tentCell: {
    minHeight: 40,
    borderRadius: 10,
    border: `1px solid ${theme.lineSoft}`,
    background: theme.window,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tentCellActive: { background: '#f3faf4', border: '1px solid rgba(34,197,94,0.28)' },
  tentLevelText: { fontSize: 10, color: theme.textSoft },
  tentQty: { fontSize: 12, fontWeight: 700, color: '#16a34a' },
  summaryList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 14,
    background: '#f5f5f7',
    border: `1px solid ${theme.lineSoft}`,
    padding: '12px 14px',
  },
  summaryLabel: { fontSize: 13, color: theme.text, minWidth: 0 },
  summaryQty: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2563eb',
    background: '#eef6ff',
    border: '1px solid rgba(59,130,246,0.12)',
    borderRadius: 999,
    padding: '4px 10px',
    whiteSpace: 'nowrap',
  },
}
