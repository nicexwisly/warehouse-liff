import { useMemo, useState } from 'react'
import { searchItems, deductItem } from './api'
import BarcodeScanner from './BarcodeScanner'
import { theme } from './theme'

const BASE = import.meta.env.VITE_API_URL

function parseContainerLabel(label = '') {
  const match = label.match(/^CON(\d+)([A-Z])-?(\d{1,2})-(\d+)$/i)
  if (!match) return null
  return {
    containerNo: Number(match[1]),
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
      const key = `${con.containerNo}-${con.group}-${con.slot}`
      containerHighlights[key] = {
        qty: (containerHighlights[key]?.qty || 0) + qty,
        label,
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

function getContainerGroups(containerHighlights) {
  const numbers = [...new Set(Object.keys(containerHighlights).map(key => Number(key.split('-')[0])))]
  return numbers.sort((a, b) => a - b)
}

function SlotBox({ number, active, qty }) {
  return (
    <div
      style={{
        ...mapStyles.slotBox,
        ...(active ? mapStyles.slotBoxActive : null),
      }}
    >
      <span style={mapStyles.slotNumber}>{number}</span>
      {active ? <span style={mapStyles.slotQty}>{qty}</span> : <span style={mapStyles.slotPlus}>+</span>}
    </div>
  )
}

function ContainerColumn({ group, containerNo, highlights }) {
  const rows = [
    [4, 8],
    [3, 7],
    [2, 6],
    [1, 5],
  ]

  return (
    <div style={mapStyles.containerColumnWrap}>
      <div style={mapStyles.containerColumnGrid}>
        {rows.map(([left, right]) => {
          const leftData = highlights[`${containerNo}-${group}-${left}`]
          const rightData = highlights[`${containerNo}-${group}-${right}`]
          return (
            <div key={`${group}-${left}-${right}`} style={{ display: 'contents' }}>
              <SlotBox number={left} active={!!leftData} qty={leftData?.qty} />
              <SlotBox number={right} active={!!rightData} qty={rightData?.qty} />
            </div>
          )
        })}
      </div>
      <div style={mapStyles.groupLabelBottom}>{group}</div>
    </div>
  )
}

function ContainerSection({ containerNo, highlights }) {
  return (
    <div style={mapStyles.sectionCard}>
      <div style={mapStyles.sectionHeaderRow}>
        <div style={mapStyles.sectionTitle}>ตู้คอน {containerNo}</div>
        <div style={mapStyles.sectionHint}>ไฮไลท์ทุกจุดที่พบ</div>
      </div>
      <div style={mapStyles.containerColumnsRow}>
        {['A', 'B', 'C'].map(group => (
          <ContainerColumn key={`${containerNo}-${group}`} group={group} containerNo={containerNo} highlights={highlights} />
        ))}
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
      <div style={mapStyles.sectionHeaderRow}>
        <div style={mapStyles.sectionTitle}>พาเลท</div>
        <div style={mapStyles.sectionHint}>แสดงตำแหน่งที่พบ</div>
      </div>
      <div style={mapStyles.tentScroll}>
        <div style={{ ...mapStyles.tentGrid, gridTemplateColumns: `40px repeat(${slots.length}, minmax(56px, 1fr))` }}>
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
                        {data ? <span style={mapStyles.tentQty}>{data.qty}</span> : <span style={mapStyles.slotPlus}>+</span>}
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
  const containerNos = getContainerGroups(containerHighlights)
  const hasContainers = containerNos.length > 0
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
          {hasContainers && containerNos.map(containerNo => (
            <ContainerSection key={`con-${containerNo}`} containerNo={containerNo} highlights={containerHighlights} />
          ))}
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
      setShowMapModal(items.length > 0)
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
  countRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  count: { fontSize: 13, color: theme.textMuted },
  mapBtn: { ...theme.button, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: theme.blue, background: theme.blueSoft },
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

const mapStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20,20,24,0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  modalCard: {
    width: 'min(100%, 560px)',
    maxHeight: 'calc(100vh - 24px)',
    overflow: 'hidden',
    borderRadius: 22,
    background: theme.window,
    border: `1px solid ${theme.line}`,
    boxShadow: theme.shadow,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    padding: '14px 16px 12px',
    borderBottom: `1px solid ${theme.lineSoft}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalEyebrow: { fontSize: 11, color: theme.textSoft, marginBottom: 2 },
  modalTitle: { fontSize: 22, fontWeight: 700, color: theme.text },
  closeBtn: { ...theme.button, padding: '8px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  modalBody: { padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  sectionCard: { background: theme.panel, border: `1px solid ${theme.lineSoft}`, borderRadius: 18, padding: 12, boxShadow: theme.shadowSoft },
  sectionHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: theme.text },
  sectionHint: { fontSize: 11, color: theme.textSoft },
  containerColumnsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  containerColumnWrap: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  containerColumnGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 },
  groupLabelBottom: { textAlign: 'center', fontSize: 13, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.2em' },
  slotBox: {
    minHeight: 52,
    borderRadius: 12,
    border: `1px solid ${theme.lineSoft}`,
    background: theme.window,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '6px 4px',
  },
  slotBoxActive: { background: '#eef6ff', border: '1px solid rgba(10,132,255,0.28)' },
  slotNumber: { fontSize: 16, fontWeight: 700, color: theme.text },
  slotQty: { fontSize: 11, fontWeight: 700, color: theme.blue },
  slotPlus: { fontSize: 14, color: '#c7c7cc' },
  tentScroll: { overflowX: 'auto' },
  tentGrid: { display: 'grid', gap: 6, minWidth: 260 },
  tentColHeader: { textAlign: 'center', fontSize: 11, color: theme.textSoft, fontWeight: 600 },
  tentRowHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: theme.textMuted, background: theme.toolbar, borderRadius: 10, border: `1px solid ${theme.lineSoft}` },
  tentSlotStack: { display: 'flex', flexDirection: 'column', gap: 4 },
  tentCell: { minHeight: 46, borderRadius: 10, border: `1px solid ${theme.lineSoft}`, background: theme.window, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
  tentCellActive: { background: '#eef6ff', border: '1px solid rgba(10,132,255,0.28)' },
  tentLevelText: { fontSize: 10, color: theme.textSoft },
  tentQty: { fontSize: 13, fontWeight: 700, color: theme.blue },
  summaryList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 },
  summaryRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 12, background: theme.window, border: `1px solid ${theme.lineSoft}`, padding: '10px 12px' },
  summaryLabel: { fontSize: 13, color: theme.text, minWidth: 0 },
  summaryQty: { fontSize: 11, fontWeight: 700, color: theme.blue, background: '#eef6ff', border: '1px solid rgba(10,132,255,0.18)', borderRadius: 999, padding: '4px 8px', whiteSpace: 'nowrap' },
}
