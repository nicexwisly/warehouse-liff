import { Fragment, useEffect, useState } from 'react'
import { getPalletDetail, addItem, deductItem } from './api'
import ItemSearchInput from './ItemSearchInput'
import { theme } from './theme'

const BASE = import.meta.env.VITE_API_URL

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
              <button onClick={() => { setView(v => v === 'add' ? 'list' : 'add'); setActionMsg(null) }} style={{ ...ms.tabBtn, ...(view === 'add' ? ms.tabBtnActive : null) }}>
                {view === 'add' ? '← รายการ' : '+ เพิ่ม'}
              </button>
            )}
            <button onClick={onClose} style={ms.closeBtn}>✕</button>
          </div>
        </div>

        {actionMsg && <div style={{ padding: '8px 16px', fontSize: 13, background: actionMsg.type === 'success' ? theme.greenSoft : theme.redSoft, color: actionMsg.type === 'success' ? '#208142' : theme.red }}>{actionMsg.text}</div>}

        {modal.loading ? <p style={ms.centerText}>กำลังโหลด...</p>
        : modal.error ? <p style={{ ...ms.centerText, color: theme.red }}>{modal.error}</p>
        : view === 'list' ? (
          <div style={ms.itemList}>
            {modal.items.length === 0 && (
              <div style={ms.emptyState}>
                <p style={{ color: theme.textSoft, fontSize: 14 }}>ยังไม่มีสินค้า</p>
                <button onClick={() => setView('add')} style={ms.addFirstBtn}>+ เพิ่มสินค้าแรก</button>
              </div>
            )}
            {modal.items.map((item, i) => (
              <div key={item.id} style={{ ...ms.itemRow, borderTop: i > 0 ? `1px solid ${theme.lineSoft}` : 'none' }}>
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
              <span style={{ fontSize: 13, color: theme.textMuted }}>จำนวน</span>
              <button onClick={() => setForm(f => ({ ...f, qty: Math.max(1, f.qty - 1) }))} style={ms.qtyBtn}>−</button>
              <input style={{ ...theme.input, width: 60, textAlign: 'center', fontWeight: 700 }} type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) || 1 }))} />
              <button onClick={() => setForm(f => ({ ...f, qty: f.qty + 1 }))} style={ms.qtyBtn}>+</button>
            </div>
            <button onClick={handleAdd} style={ms.confirmAddBtn} disabled={actionLoading}>{actionLoading ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,20,22,0.32)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', zIndex: 100 },
  card: { background: theme.window, borderRadius: '18px 18px 0 0', width: '100%', maxHeight: '82vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)', borderTop: `1px solid ${theme.line}` },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: `1px solid ${theme.lineSoft}`, background: theme.toolbar },
  title: { fontSize: 18, fontWeight: 700, color: theme.text },
  sub: { fontSize: 13, color: theme.textSoft, marginTop: 2 },
  tabBtn: { ...theme.button, padding: '6px 14px', fontSize: 13, fontWeight: 600 },
  tabBtnActive: { background: theme.blue, color: '#fff', borderColor: 'rgba(10,132,255,0.25)' },
  closeBtn: { ...theme.button, borderRadius: 999, width: 30, height: 30, fontSize: 14, color: theme.textMuted },
  centerText: { padding: 24, textAlign: 'center', color: theme.textSoft },
  itemList: { overflowY: 'auto', flex: 1, background: theme.panel },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0' },
  addFirstBtn: { ...theme.primaryButton, padding: '8px 20px', fontWeight: 600 },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px' },
  itemName: { fontSize: 14, fontWeight: 600, color: theme.text },
  itemCode: { fontSize: 12, color: theme.textSoft, marginTop: 2 },
  qtyBadge: { fontSize: 15, fontWeight: 700, color: theme.text, minWidth: 28, textAlign: 'center' },
  deductBtn: { ...theme.button, padding: '5px 10px', color: theme.red, background: theme.redSoft, fontSize: 12, fontWeight: 600 },
  addForm: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' },
  qtyBtn: { ...theme.button, width: 38, height: 38, fontSize: 20, flexShrink: 0 },
  confirmAddBtn: { ...theme.primaryButton, padding: '12px', fontWeight: 700, fontSize: 15 },
}

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

  if (loading) return <p style={{ padding: 24, textAlign: 'center', color: theme.textSoft }}>กำลังโหลด...</p>
  if (!map) return null

  const rows = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div style={{ padding: '8px 10px' }}>
      <div style={sectionStyles.panel}>
        <div style={sectionStyles.headerRow}><div style={sectionStyles.title}>Tent Rack</div><div style={sectionStyles.sub}>แตะช่องเพื่อดูพาเลทและรายการสินค้า</div></div>
        <div style={ts.grid}><div />{[1, 2, 3, 4].map(s => <div key={s} style={ts.colHeader}>ล็อค {s}</div>)}</div>
        {rows.map(([row, slots]) => (
          <div key={row} style={ts.grid}>
            <div style={ts.rowHeader}>แถว {row}</div>
            {[1, 2, 3, 4].map(slot => {
              const slotData = slots[String(slot)] || {}
              const levels = Object.entries(slotData).sort(([a], [b]) => Number(a) - Number(b))
              return (
                <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {levels.map(([level, data]) => {
                    const hasItems = data.item_count > 0
                    return (
                      <div key={level} onClick={() => handleCellClick(data)} style={{ ...ts.cell, background: hasItems ? '#f3fbf5' : '#fafafb', border: modal?.label === data.label ? `2px solid ${theme.blue}` : hasItems ? '1px solid rgba(52,199,89,0.35)' : `1px solid ${theme.line}` }}>
                        <span style={ts.levelLabel}>ชั้น {level}</span>
                        <span style={ts.slotLabel}>{data.label}</span>
                        {hasItems ? <span style={ts.count}>{data.item_count}</span> : <span style={ts.plus}>+</span>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {modal && <PalletModal modal={modal} profile={profile} onClose={() => { setModal(null); loadMap() }} onRefresh={items => setModal(m => ({ ...m, items }))} />}
    </div>
  )
}

const ts = {
  grid: { display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr 1fr', gap: 6, marginBottom: 6 },
  colHeader: { textAlign: 'center', fontSize: 11, color: theme.textSoft, fontWeight: 600, paddingBottom: 2 },
  rowHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: theme.toolbar, borderRadius: 10, color: theme.textMuted, border: `1px solid ${theme.lineSoft}` },
  cell: { borderRadius: 10, padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 56, cursor: 'pointer' },
  levelLabel: { fontSize: 10, color: theme.textSoft },
  slotLabel: { fontSize: 10, color: theme.textMuted, marginTop: 2 },
  count: { fontSize: 16, fontWeight: 700, color: '#208142', lineHeight: 1.2, marginTop: 2 },
  plus: { fontSize: 16, color: '#c7c7cc' },
}

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

  if (loading) return <p style={{ padding: 24, textAlign: 'center', color: theme.textSoft }}>กำลังโหลด...</p>
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

  const containerNos = Object.keys(conData).map(Number).sort((a, b) => a - b)
  const containerLabels = ['A', 'B', 'C']

  function getContainerSlotData(containerNo, visualSlot) {
    const container = conData[containerNo] || {}
    if (visualSlot >= 1 && visualSlot <= 4) return container.A?.[String(visualSlot)]?.['1'] || null
    const mappedSlot = visualSlot - 4
    return container.B?.[String(mappedSlot)]?.['1'] || null
  }

  return (
    <div style={{ padding: '8px 10px' }}>
      <div style={sectionStyles.panel}>
        <div style={sectionStyles.headerRow}><div style={sectionStyles.title}>Computer Cabinet</div><div style={sectionStyles.sub}>แตะช่องที่ต้องการจาก layout แนวตั้ง</div></div>

        <div style={cs.columnsWrap}>
          {containerNos.map((containerNo, idx) => (
            <div key={containerNo} style={cs.columnCard}>
              <div style={cs.slotGrid}>
                {[4, 3, 2, 1].map(leftSlot => {
                  const rightSlot = leftSlot + 4
                  const leftData = getContainerSlotData(containerNo, leftSlot)
                  const rightData = getContainerSlotData(containerNo, rightSlot)
                  return (
                    <Fragment key={`${containerNo}-${leftSlot}`}>
                      <ContainerCell data={leftData} visualSlot={leftSlot} modal={modal} onClick={handleCellClick} />
                      <ContainerCell data={rightData} visualSlot={rightSlot} modal={modal} onClick={handleCellClick} />
                    </Fragment>
                  )
                })}
              </div>
              <div style={cs.columnLabel}>{containerLabels[idx] || `C${containerNo}`}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && <PalletModal modal={modal} profile={profile} onClose={() => { setModal(null); loadMap() }} onRefresh={items => setModal(m => ({ ...m, items }))} />}
    </div>
  )
}

function ContainerCell({ data, visualSlot, modal, onClick }) {
  const hasItems = (data?.item_count || 0) > 0
  const isActive = modal?.label === data?.label
  return (
    <div
      onClick={() => data && onClick(data)}
      style={{
        ...cs.cell,
        cursor: data ? 'pointer' : 'default',
        background: hasItems ? '#f3fbf5' : '#fafafb',
        border: isActive ? `2px solid ${theme.blue}` : hasItems ? '1px solid rgba(52,199,89,0.35)' : `1px solid ${theme.line}`,
      }}
    >
      <div style={cs.slotNumber}>{visualSlot}</div>
      {data ? (
        <>
          <span style={cs.labelText}>{data.label}</span>
          {hasItems ? <span style={cs.count}>{data.item_count}</span> : <span style={cs.plus}>+</span>}
        </>
      ) : (
        <span style={cs.emptyText}>ไม่มี</span>
      )}
    </div>
  )
}

const cs = {
  columnsWrap: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 },
  columnCard: { background: theme.panel, borderRadius: 18, padding: 10, border: `1px solid ${theme.lineSoft}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  slotGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' },
  cell: { borderRadius: 12, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 78, textAlign: 'center' },
  slotNumber: { fontSize: 24, fontWeight: 700, color: theme.text, lineHeight: 1 },
  labelText: { fontSize: 10, color: theme.textSoft, marginTop: 6, lineHeight: 1.2 },
  count: { fontSize: 18, fontWeight: 700, color: '#208142', marginTop: 4 },
  plus: { fontSize: 18, color: '#c7c7cc', marginTop: 4 },
  emptyText: { fontSize: 11, color: '#c7c7cc', marginTop: 6 },
  columnLabel: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 40, borderRadius: 12, background: theme.toolbar, border: `1px solid ${theme.lineSoft}`, fontSize: 22, fontWeight: 800, color: theme.textMuted, letterSpacing: '0.18em', paddingLeft: '0.18em' },
}

const sectionStyles = {
  panel: { background: theme.window, borderRadius: 16, border: `1px solid ${theme.line}`, padding: 12, boxShadow: theme.shadowSoft },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 2px 12px' },
  title: { fontSize: 16, fontWeight: 700, color: theme.text },
  sub: { fontSize: 12, color: theme.textSoft, textAlign: 'right' },
  tab: { ...theme.button, flex: 1, padding: '8px 0', fontWeight: 600, fontSize: 14 },
  tabActive: { background: theme.blue, color: '#fff', borderColor: 'rgba(10,132,255,0.25)' },
}

export default function MapPage({ profile }) {
  const [activeZone, setActiveZone] = useState('tent')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: theme.toolbar, padding: '14px 16px 0', borderBottom: `1px solid ${theme.line}` }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 12 }}>Map</h1>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
          {[
            { key: 'tent', label: '🏕️ เต้นท์' },
            { key: 'container', label: '🖥️ ตู้คอม' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveZone(tab.key)} style={{ ...sectionStyles.tab, ...(activeZone === tab.key ? sectionStyles.tabActive : null), flex: 'unset', padding: '8px 14px' }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeZone === 'tent' ? <TentMap profile={profile} /> : <ContainerMap profile={profile} />}
      </div>
    </div>
  )
}
