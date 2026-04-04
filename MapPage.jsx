import { useEffect, useState } from 'react'
import { getPalletDetail, addItem, deductItem } from './api'
import ItemSearchInput from './ItemSearchInput'

const BASE = import.meta.env.VITE_API_URL

// ============================================================
// Shared: Modal เพิ่ม/ลบสินค้า (ใช้ร่วมกันทั้ง Tent และ Container)
// ============================================================
function PalletModal({ modal, profile, onClose, onRefresh }) {
  const [view, setView] = useState('list')
  const [form, setForm] = useState({ item_code: '', item_name: '', qty: 1 })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  async function handleAdd() {
    if (!form.item_code || !form.item_name) return setActionMsg({ type: 'error', text: 'กรุณาเลือกสินค้า' })
    setActionLoading(true)
    try {
      await addItem({ pallet_id: modal.pallet.id, item_code: form.item_code, item_name: form.item_name, qty: Number(form.qty), actor_name: profile?.displayName, actor_user_id: profile?.userId })
      setActionMsg({ type: 'success', text: `เพิ่ม "${form.item_name}" แล้ว` })
      setForm({ item_code: '', item_name: '', qty: 1 })
      const detail = await getPalletDetail(modal.pallet.id)
      onRefresh(detail.items)
      setView('list')
    } catch (e) {
      setActionMsg({ type: 'error', text: e.message })
    } finally { setActionLoading(false) }
  }

  async function handleDeduct(item) {
    const input = window.prompt(`หยิบ "${item.item_name}" ออกกี่ชิ้น? (มี ${item.qty})`)
    if (!input) return
    const qty = Number(input)
    if (isNaN(qty) || qty <= 0) return
    setActionLoading(true)
    try {
      const res = await deductItem(item.id, { qty, actor_name: profile?.displayName, actor_user_id: profile?.userId })
      setActionMsg({ type: 'success', text: res.message })
      const detail = await getPalletDetail(modal.pallet.id)
      onRefresh(detail.items)
    } catch (e) {
      setActionMsg({ type: 'error', text: e.message })
    } finally { setActionLoading(false) }
  }

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.card} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <div>
            <p style={ms.title}>{modal.label}</p>
            {modal.pallet && <p style={ms.sub}>พาเลท {modal.pallet.pallet_code}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {modal.pallet && (
              <button onClick={() => { setView(v => v === 'add' ? 'list' : 'add'); setActionMsg(null) }}
                style={{ ...ms.tabBtn, background: view === 'add' ? '#06c755' : '#f0f0f0', color: view === 'add' ? '#fff' : '#444' }}>
                {view === 'add' ? '← รายการ' : '+ เพิ่ม'}
              </button>
            )}
            <button onClick={onClose} style={ms.closeBtn}>✕</button>
          </div>
        </div>

        {actionMsg && (
          <div style={{ padding: '8px 16px', fontSize: 13,
            background: actionMsg.type === 'success' ? '#e6faf0' : '#fff5f5',
            color: actionMsg.type === 'success' ? '#0a7a3e' : '#e53e3e' }}>
            {actionMsg.text}
          </div>
        )}

        {modal.loading ? <p style={ms.centerText}>กำลังโหลด...</p>
        : modal.error ? <p style={{ ...ms.centerText, color: '#e53e3e' }}>{modal.error}</p>
        : view === 'list' ? (
          <div style={ms.itemList}>
            {modal.items.length === 0 && (
              <div style={ms.emptyState}>
                <p style={{ color: '#aaa', fontSize: 14 }}>ยังไม่มีสินค้า</p>
                <button onClick={() => setView('add')} style={ms.addFirstBtn}>+ เพิ่มสินค้าแรก</button>
              </div>
            )}
            {modal.items.map((item, i) => (
              <div key={item.id} style={{ ...ms.itemRow, borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={ms.itemName}>{item.item_name}</p>
                  <p style={ms.itemCode}>{item.item_code}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={ms.qtyBadge}>{item.qty}</span>
                  <button onClick={() => handleDeduct(item)} disabled={actionLoading} style={ms.deductBtn}>ลบออก</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={ms.addForm}>
            <ItemSearchInput
              value={{ item_code: form.item_code, item_name: form.item_name }}
              onChange={selected => setForm(f => ({ ...f, item_code: selected.code, item_name: selected.name }))}
              onClear={() => setForm(f => ({ ...f, item_code: '', item_name: '' }))}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#555' }}>จำนวน</span>
              <button onClick={() => setForm(f => ({ ...f, qty: Math.max(1, f.qty-1) }))} style={ms.qtyBtn}>−</button>
              <input style={{ ...ms.input, width: 60, textAlign: 'center', fontWeight: 700 }} type="number"
                value={form.qty} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value)||1 }))} />
              <button onClick={() => setForm(f => ({ ...f, qty: f.qty+1 }))} style={ms.qtyBtn}>+</button>
            </div>
            <button onClick={handleAdd} style={ms.confirmAddBtn} disabled={actionLoading}>
              {actionLoading ? 'กำลังบันทึก...' : '+ เพิ่มสินค้า'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', zIndex: 100 },
  card: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' },
  title: { fontSize: 18, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  tabBtn: { padding: '6px 14px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  closeBtn: { background: '#f5f5f5', border: 'none', borderRadius: 20, width: 30, height: 30, fontSize: 14, cursor: 'pointer', color: '#666' },
  centerText: { padding: 24, textAlign: 'center', color: '#aaa' },
  itemList: { overflowY: 'auto', flex: 1 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0' },
  addFirstBtn: { padding: '8px 20px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px' },
  itemName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  itemCode: { fontSize: 12, color: '#888', marginTop: 2 },
  qtyBadge: { fontSize: 15, fontWeight: 700, color: '#1a1a1a', minWidth: 28, textAlign: 'center' },
  deductBtn: { padding: '5px 10px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  addForm: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 200, overflowY: 'auto' },
  dropItem: { padding: '9px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 },
  dropCode: { fontSize: 11, color: '#888', fontWeight: 600 },
  dropName: { fontSize: 13, color: '#1a1a1a' },
  selectedBox: { background: '#e6faf0', padding: '10px 12px', borderRadius: 8 },
  qtyBtn: { width: 38, height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 20, cursor: 'pointer', flexShrink: 0 },
  confirmAddBtn: { padding: '12px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
}

// ============================================================
// Tent Map
// ============================================================
function TentMap({ profile }) {
  const [map, setMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  async function loadMap() {
    setLoading(true)
    try { setMap(await fetch(`${BASE}/locations/map?zone=tent`).then(r => r.json())) } catch {}
    setLoading(false)
  }

  useEffect(() => { loadMap() }, [])

  async function handleCellClick(data) {
    setModal({ label: data.label, pallet: null, items: [], loading: true })
    try {
      const [locsRes, palsRes] = await Promise.all([
        fetch(`${BASE}/locations`).then(r => r.json()),
        fetch(`${BASE}/pallets`).then(r => r.json()),
      ])
      const loc = locsRes.find(l => l.label === data.label)
      const pallet = palsRes.find(p => p.location_id === loc?.id)
      if (!pallet) { setModal(m => ({ ...m, loading: false, error: 'ไม่พบพาเลทในตำแหน่งนี้' })); return }
      const detail = await getPalletDetail(pallet.id)
      setModal({ label: data.label, pallet, items: detail.items, loading: false })
    } catch (e) { setModal(m => ({ ...m, loading: false, error: e.message })) }
  }

  if (loading) return <p style={{ padding: 24, textAlign: 'center', color: '#888' }}>กำลังโหลด...</p>
  if (!map) return null

  const rows = Object.entries(map).sort(([a],[b]) => a.localeCompare(b))

  return (
    <div style={{ padding: '8px 10px' }}>
      <div style={ts.grid}>
        <div />
        {[1,2,3,4].map(s => <div key={s} style={ts.colHeader}>ล็อค {s}</div>)}
      </div>
      {rows.map(([row, slots]) => (
        <div key={row} style={ts.grid}>
          <div style={ts.rowHeader}>แถว {row}</div>
          {[1,2,3,4].map(slot => {
            const slotData = slots[String(slot)] || {}
            const levels = Object.entries(slotData).sort(([a],[b]) => Number(a)-Number(b))
            return (
              <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {levels.map(([level, data]) => {
                  const hasItems = data.item_count > 0
                  return (
                    <div key={level} onClick={() => handleCellClick(data)} style={{
                      ...ts.cell,
                      background: hasItems ? '#e6faf0' : '#fafafa',
                      border: modal?.label === data.label ? '2px solid #06c755' : hasItems ? '1.5px solid #06c755' : '1.5px solid #e8e8e8',
                    }}>
                      <span style={ts.levelLabel}>ชั้น {level}</span>
                      {hasItems ? <span style={ts.count}>{data.item_count}</span> : <span style={ts.plus}>+</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}
      {modal && <PalletModal modal={modal} profile={profile} onClose={() => { setModal(null); loadMap() }}
        onRefresh={items => setModal(m => ({ ...m, items }))} />}
    </div>
  )
}

const ts = {
  grid: { display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr 1fr', gap: 4, marginBottom: 4 },
  colHeader: { textAlign: 'center', fontSize: 11, color: '#999', fontWeight: 600, paddingBottom: 2 },
  rowHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: '#f5f5f5', borderRadius: 6 },
  cell: { borderRadius: 6, padding: '5px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 44, cursor: 'pointer' },
  levelLabel: { fontSize: 10, color: '#aaa' },
  count: { fontSize: 16, fontWeight: 700, color: '#06c755', lineHeight: 1.2 },
  plus: { fontSize: 16, color: '#ccc' },
}

// ============================================================
// Container Map
// ============================================================
function ContainerMap({ profile }) {
  const [map, setMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  async function loadMap() {
    setLoading(true)
    try { setMap(await fetch(`${BASE}/locations/map?zone=container`).then(r => r.json())) } catch {}
    setLoading(false)
  }

  useEffect(() => { loadMap() }, [])

  async function handleCellClick(data) {
    setModal({ label: data.label, pallet: null, items: [], loading: true })
    try {
      const [locsRes, palsRes] = await Promise.all([
        fetch(`${BASE}/locations`).then(r => r.json()),
        fetch(`${BASE}/pallets`).then(r => r.json()),
      ])
      const loc = locsRes.find(l => l.label === data.label)
      const pallet = palsRes.find(p => p.location_id === loc?.id)
      if (!pallet) { setModal(m => ({ ...m, loading: false, error: 'ไม่พบพาเลทในตำแหน่งนี้' })); return }
      const detail = await getPalletDetail(pallet.id)
      setModal({ label: data.label, pallet, items: detail.items, loading: false })
    } catch (e) { setModal(m => ({ ...m, loading: false, error: e.message })) }
  }

  if (loading) return <p style={{ padding: 24, textAlign: 'center', color: '#888' }}>กำลังโหลด...</p>
  if (!map) return null

  const conData = {}
  for (const [rowKey, slots] of Object.entries(map)) {
    const m = rowKey.match(/^CON(\d+)([A-Z]+)$/)
    if (!m) continue
    const conNo = Number(m[1])
    const rowLetter = m[2]
    if (!conData[conNo]) conData[conNo] = {}
    conData[conNo][rowLetter] = slots
  }

  const containerNos = Object.keys(conData).map(Number).sort()
  const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F']
  const rowPairs = [
    { leftSlot: 4, rightSlot: 4, leftNumber: 4, rightNumber: 8 },
    { leftSlot: 3, rightSlot: 3, leftNumber: 3, rightNumber: 7 },
    { leftSlot: 2, rightSlot: 2, leftNumber: 2, rightNumber: 6 },
    { leftSlot: 1, rightSlot: 1, leftNumber: 1, rightNumber: 5 },
  ]

  function getCellData(containerNo, rowLetter, slot) {
    return conData[containerNo]?.[rowLetter]?.[String(slot)]?.['1'] || null
  }

  function renderCell(data, fallbackNumber) {
    if (!data) {
      return (
        <div style={{ ...cs.cell, ...cs.emptyCell }}>
          <span style={cs.number}>{fallbackNumber}</span>
          <span style={cs.labelText}>-</span>
          <span style={cs.plus}>+</span>
        </div>
      )
    }

    const hasItems = data.item_count > 0
    return (
      <div
        onClick={() => handleCellClick(data)}
        style={{
          ...cs.cell,
          background: hasItems ? '#eef8f0' : '#fafafa',
          border: modal?.label === data.label
            ? '1.5px solid #06c755'
            : hasItems
              ? '1.5px solid #b7e4c3'
              : '1.5px solid #e2e8f0',
        }}
      >
        <span style={cs.number}>{fallbackNumber}</span>
        <span style={cs.labelText}>{data.label}</span>
        {hasItems ? <span style={cs.count}>{data.item_count}</span> : <span style={cs.plus}>+</span>}
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 10px' }}>
      <div style={cs.wrapper}>
        <div style={cs.headerRow}>
          <p style={cs.sectionTitle}>Container ST129</p>
          <p style={cs.sectionHint}>แตะช่องที่ต้องการจาก layout แนวตั้ง</p>
        </div>

        <div style={cs.groupsGrid}>
          {containerNos.map((containerNo, index) => (
            <div key={containerNo} style={cs.groupCard}>
              <div style={cs.groupSlots}>
                {rowPairs.map(pair => (
                  <div key={`row-${containerNo}-${pair.leftNumber}-${pair.rightNumber}`} style={cs.rowPair}>
                    <div style={cs.slotWrap}>
                      {renderCell(getCellData(containerNo, 'A', pair.leftSlot), pair.leftNumber)}
                    </div>
                    <div style={cs.slotWrap}>
                      {renderCell(getCellData(containerNo, 'B', pair.rightSlot), pair.rightNumber)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={cs.groupLabel}>{groupLabels[index] || String(containerNo)}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && <PalletModal modal={modal} profile={profile} onClose={() => { setModal(null); loadMap() }}
        onRefresh={items => setModal(m => ({ ...m, items }))} />}
    </div>
  )
}

const cs = {
  wrapper: { background: '#fff', borderRadius: 18, padding: 10, border: '1px solid #ececec' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 },
  sectionHint: { fontSize: 10, color: '#8d8d95', textAlign: 'right', lineHeight: 1.3, maxWidth: 120 },
  groupsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'stretch' },
  groupCard: { background: '#f8f8f8', borderRadius: 14, padding: '8px 5px 10px', border: '1px solid #ededed', minWidth: 0 },
  groupSlots: { display: 'grid', gridTemplateColumns: '1fr', gap: 6 },
  rowPair: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 },
  slotWrap: { minWidth: 0 },
  groupLabel: { marginTop: 8, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.28em', paddingLeft: '0.28em' },
  cell: { borderRadius: 14, padding: '7px 3px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: 88, cursor: 'pointer', minWidth: 0 },
  emptyCell: { background: '#fafafa', border: '1.5px dashed #e4e4e7' },
  number: { fontSize: 13, fontWeight: 800, color: '#1a1a1a', lineHeight: 1 },
  labelText: { fontSize: 6.5, color: '#8f8f97', lineHeight: 1.15, marginTop: 4, textAlign: 'center', wordBreak: 'break-word' },
  count: { fontSize: 15, fontWeight: 700, color: '#16a34a', lineHeight: 1, marginTop: 6 },
  plus: { fontSize: 14, color: '#c3c3c8', lineHeight: 1, marginTop: 6 },
}

// ============================================================
// MapPage — main component ที่มี tab Tent / Container
// ============================================================
export default function MapPage({ profile }) {
  const [activeZone, setActiveZone] = useState('tent')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header + zone toggle */}
      <div style={{ background: '#fff', padding: '12px 16px 0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>แผนที่</h1>
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f0f0f0' }}>
          {[
            { key: 'tent', label: '🏕️ เต้นท์' },
            { key: 'container', label: '🚛 ตู้คอนเทนเนอร์' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveZone(tab.key)} style={{
              padding: '8px 16px', border: 'none', background: 'none', fontSize: 14, fontWeight: 600,
              color: activeZone === tab.key ? '#06c755' : '#888',
              borderBottom: activeZone === tab.key ? '2px solid #06c755' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeZone === 'tent'
          ? <TentMap profile={profile} />
          : <ContainerMap profile={profile} />
        }
      </div>
    </div>
  )
}
