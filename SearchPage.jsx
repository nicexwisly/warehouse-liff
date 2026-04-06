import { useMemo, useState } from 'react'
import { searchItems, deductItem } from './api'
import BarcodeScanner from './BarcodeScanner'
import { theme } from './theme'

const BASE = import.meta.env.VITE_API_URL

function parseContainerLabel(label = '') {
  const match = label.match(/^CON(\d+)([A-Z])-?(\d{1,2})-(\d+)$/i)
  if (!match) return null
  return {
    group: match[2].toUpperCase(),
    slot: Number(match[3]),
    level: Number(match[4]),
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
  const summary = []

  items.forEach(item => {
    const qty = Number(item.qty) || 0
    const label = item.location_label || '-'
    summary.push({ label, qty })

    const con = parseContainerLabel(label)
    if (con) {
      const key = `${con.group}-${con.slot}`
      containerHighlights[key] = {
        qty: (containerHighlights[key]?.qty || 0) + qty,
        labels: [...(containerHighlights[key]?.labels || []), label],
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
  const rows = [
    [4, 8],
    [3, 7],
    [2, 6],
    [1, 5],
  ]
  const zones = ['A', 'B', 'C']

  return (
    <div style={mapStyles.sectionCard}>
      <div style={mapStyles.sectionHeader}>
        <div style={mapStyles.sectionTitle}>Computer Cabinet</div>
        <div style={mapStyles.sectionHint}>ไฮไลท์ทุกจุดที่พบ</div>
      </div>

      <div style={mapStyles.containerFrame}>
        <div style={mapStyles.containerColumns}>
          {zones.map(zone => (
            <div key={zone} style={mapStyles.containerColumn}>
              <div style={mapStyles.containerZoneGrid}>
                {rows.map(([left, right]) => (
                  <div key={`${zone}-${left}-${right}`} style={{ display: 'contents' }}>
                    <ContainerCell number={left} activeData={highlights[`${zone}-${left}`]} />
                    <ContainerCell number={right} activeData={highlights[`${zone}-${right}`]} />
                  </div>
                ))}
              </div>
              <div style={mapStyles.zoneLabel}>{zone}</div>
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
      setResults(items)
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
    try {
      const res = await deductItem(item.id, {
        qty,
        actor_name: profile?.displayName,
        actor_user_id: profile?.userId,
      })
      alert(res.message)
      const refreshed = await searchItems(q.trim())
      setResults(refreshed)
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
          {searched && !loading && (
            <div style={styles.countRow}>
              <p style={styles.count}>{results.length > 0 ? `พบ ${results.length} รายการ` : 'ไม่พบสินค้านี้ในระบบ'}</p>
              {results.length > 0 && <button onClick={() => setShowMapModal(true)} style={styles.mapBtn}>ดูแผนที่</button>}
            </div>
          )}

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
                  <div style={{ minWidth: 0 }}>
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
  countRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  count: { fontSize: 13, color: theme.textMuted },
  mapBtn: { ...theme.button, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: theme.blue, background: theme.blueSoft },
  listShell: { background: theme.panel, borderRadius: 14, border: `1px solid ${theme.line}`, overflow: 'hidden', boxShadow: theme.shadowSoft },
  listHeader: { display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: theme.textSoft, background: theme.toolbarStrong, borderBottom: `1px solid ${theme.line}` },
  row: { display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr', padding: '12px 14px', alignItems: 'center', borderBottom: `1px solid ${theme.lineSoft}` },
  rowSelected: { background: theme.blueSoft },
  nameCell: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  itemIcon: { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.toolbar, border: `1px solid ${theme.lineSoft}` },
  itemName: { fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemMeta: { fontSize: 12, color: theme.textSoft, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  codeCell: { fontSize: 13, color: theme.textMuted },
  locationBadge: { display: 'inline-flex', background: '#f0f6ff', color: theme.blue, border: '1px solid rgba(10,132,255,0.18)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  qtyCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  qty: { fontSize: 20, fontWeight: 700, color: theme.text },
  rowAction: { ...theme.button, padding: '6px 10px', fontSize: 12, color: theme.red, background: theme.redSoft },
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
