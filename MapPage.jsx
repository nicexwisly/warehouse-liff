import { useEffect, useState } from 'react'
import { getPalletDetail, addItem, deductItem } from './api'
import ItemSearchInput from './ItemSearchInput'

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
      await addItem({
        pallet_id: modal.pallet.id,
        item_code: form.item_code,
        item_name: form.item_name,
        qty: Number(form.qty),
        actor_name: profile?.displayName,
        actor_user_id: profile?.userId
      })
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
  qtyBtn: { width: 38, height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 20, cursor: 'pointer', flexShrink: 0 },
  confirmAddBtn: { padding: '12px', background: '#06c755', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
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

function ContainerPopup({
  selected,
  selectedPallet,
  detailLoading,
  detailError,
  detailItems,
  onClose,
  onDeduct,
  onAdd,
}) {
  if (!selected) return null

  const totalQty = detailItems.reduce((sum, item) => sum + Number(item.qty || 0), 0)

  return (
    <div style={cp.overlay} onClick={onClose}>
      <div style={cp.card} onClick={e => e.stopPropagation()}>
        <div style={cp.header}>
          <div style={{ minWidth: 0 }}>
            <div style={cp.badge}>Container {selected.label}</div>
            <div style={cp.title}>รายการสินค้าในตำแหน่งนี้</div>
            <div style={cp.sub}>
              {selectedPallet
                ? `พาเลท ${selectedPallet.pallet_code}`
                : 'กำลังตรวจสอบพาเลท...'}
            </div>
          </div>

          <button onClick={onClose} style={cp.closeBtn}>✕</button>
        </div>

        <div style={cp.summaryRow}>
          <div style={cp.summaryCard}>
            <div style={cp.summaryLabel}>จำนวนรายการ</div>
            <div style={cp.summaryValue}>{detailItems.length} SKU</div>
          </div>
          <div style={cp.summaryCard}>
            <div style={cp.summaryLabel}>จำนวนรวม</div>
            <div style={cp.summaryValue}>{totalQty} ชิ้น</div>
          </div>
        </div>

        <div style={cp.addWrap}>
          <button onClick={onAdd} style={cp.addBtn}>
            + เพิ่มสินค้า
          </button>
        </div>

        {detailLoading ? (
          <div style={cp.emptyWrap}>
            <p style={cp.emptyText}>กำลังโหลดรายการ...</p>
          </div>
        ) : detailError ? (
          <div style={cp.emptyWrap}>
            <p style={{ ...cp.emptyText, color: '#dc2626' }}>{detailError}</p>
          </div>
        ) : detailItems.length === 0 ? (
          <div style={cp.emptyWrap}>
            <p style={cp.emptyTitle}>ยังไม่มีสินค้า</p>
            <p style={cp.emptyText}>ตำแหน่งนี้ยังไม่มีรายการสินค้าในระบบ</p>
          </div>
        ) : (
          <div style={cp.list}>
            {detailItems.map(item => (
              <div key={item.id} style={cp.itemCard}>
                <div style={cp.itemRow}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={cp.itemCode}>ITEM {item.item_code}</div>
                    <div style={cp.itemName}>{item.item_name}</div>
                    <div style={cp.itemQtyBadge}>
                      คงเหลือ {item.qty} {item.unit || 'ชิ้น'}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeduct(item)}
                    style={cp.deductBtn}
                  >
                    หยิบออก
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={cp.footer}>
          <button onClick={onClose} style={cp.footerCloseBtn}>
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )
}


function ConfirmDeductModal({ item, loading, error, onClose, onConfirm }) {
  const [qty, setQty] = useState('')

  useEffect(() => {
    setQty('')
  }, [item?.id])

  if (!item) return null

  return (
    <div style={dm.overlay} onClick={loading ? undefined : onClose}>
      <div style={dm.card} onClick={e => e.stopPropagation()}>
        <div style={dm.header}>
          <div style={dm.badge}>ยืนยันการหยิบออก</div>
          <div style={dm.title}>ระบุจำนวนสินค้าที่ต้องการหยิบออก</div>
          <div style={dm.sub}>ตรวจสอบจำนวนก่อนกดยืนยัน หากเกินจำนวนคงเหลือ ระบบจะแจ้งเตือน</div>
        </div>

        <div style={dm.body}>
          <div style={dm.itemBox}>
            <div style={dm.itemCode}>ITEM {item.item_code}</div>
            <div style={dm.itemName}>{item.item_name}</div>
            <div style={dm.itemQty}>คงเหลือ {item.qty} {item.unit || 'ชิ้น'}</div>
          </div>

          <div>
            <label style={dm.label}>จำนวนที่ต้องการหยิบออก</label>
            <input
              value={qty}
              onChange={e => setQty(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="กรอกตัวเลข"
              style={dm.input}
              disabled={loading}
            />
            <div style={dm.hint}>กรอกเป็นตัวเลขเท่านั้น เช่น 1, 2, 3</div>
          </div>

          {error && <div style={dm.errorBox}>{error}</div>}
        </div>

        <div style={dm.footer}>
          <button onClick={onClose} style={dm.cancelBtn} disabled={loading}>ยกเลิก</button>
          <button onClick={() => onConfirm(qty)} style={dm.confirmBtn} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'ยืนยันหยิบออก'}
          </button>
        </div>
      </div>
    </div>
  )
}



function AddItemModal({
  open,
  selected,
  selectedPallet,
  form,
  loading,
  error,
  onClose,
  onChangeItem,
  onClearItem,
  onChangeQty,
  onSubmit,
}) {
  if (!open || !selected) return null

  return (
    <div style={am.overlay} onClick={loading ? undefined : onClose}>
      <div style={am.card} onClick={e => e.stopPropagation()}>
        <div style={am.header}>
          <div style={{ minWidth: 0 }}>
            <div style={am.badge}>เพิ่มสินค้าเข้าตำแหน่ง {selected.label}</div>
            <div style={am.title}>เลือกสินค้าและกรอกจำนวน</div>
            <div style={am.sub}>
              {selectedPallet
                ? `พาเลท ${selectedPallet.pallet_code} · ค้นหาได้ด้วย item code, ชื่อสินค้า หรือ barcode`
                : 'ค้นหาได้ด้วย item code, ชื่อสินค้า หรือ barcode'}
            </div>
          </div>

          <button onClick={onClose} style={am.closeBtn} disabled={loading}>✕</button>
        </div>

        <div style={am.body}>
          <div>
            <label style={am.label}>ค้นหาสินค้า</label>
            <ItemSearchInput
              value={{ item_code: form.item_code, item_name: form.item_name }}
              onChange={onChangeItem}
              onClear={onClearItem}
            />
            <div style={am.helper}>ค้นหาได้ด้วย: ชื่อสินค้า · รหัสสินค้า · barcode · หรือกดสแกน</div>
          </div>

          {form.item_code && form.item_name && (
            <div style={am.selectedBox}>
              <div style={am.selectedCode}>ITEM {form.item_code}</div>
              <div style={am.selectedName}>{form.item_name}</div>
              <div style={am.selectedHint}>พร้อมเพิ่มเข้า pallet/container นี้</div>
            </div>
          )}

          <div>
            <label style={am.label}>จำนวนที่ต้องการเพิ่ม</label>
            <input
              value={form.qty}
              onChange={e => onChangeQty(e.target.value)}
              inputMode="numeric"
              placeholder="กรอกตัวเลข"
              style={am.input}
              disabled={loading}
            />
            <div style={am.helper}>กรอกเป็นตัวเลขเท่านั้น เช่น 1, 2, 3</div>
          </div>

          {error && <div style={am.errorBox}>{error}</div>}
        </div>

        <div style={am.footer}>
          <button onClick={onClose} style={am.cancelBtn} disabled={loading}>ยกเลิก</button>
          <button onClick={onSubmit} style={am.confirmBtn} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'ยืนยันเพิ่มสินค้า'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ContainerMap({ profile }) {
  const [map, setMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [detailItems, setDetailItems] = useState([])
  const [selectedPallet, setSelectedPallet] = useState(null)
  const [deductModalItem, setDeductModalItem] = useState(null)
  const [deductLoading, setDeductLoading] = useState(false)
  const [deductError, setDeductError] = useState('')
  const [actionToast, setActionToast] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ item_code: '', item_name: '', qty: '1' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  async function loadMap() {
    setLoading(true)
    try { setMap(await fetch(`${BASE}/locations/map?zone=container`).then(r => r.json())) } catch {}
    setLoading(false)
  }

  useEffect(() => { loadMap() }, [])

  useEffect(() => {
    if (!actionToast) return
    const timer = setTimeout(() => setActionToast(null), 2200)
    return () => clearTimeout(timer)
  }, [actionToast])

  async function handleCellClick(data) {
    setSelected(data)
    setDetailLoading(true)
    setDetailError(null)
    setDetailItems([])
    setSelectedPallet(null)

    try {
      const [locsRes, palsRes] = await Promise.all([
        fetch(`${BASE}/locations`).then(r => r.json()),
        fetch(`${BASE}/pallets`).then(r => r.json()),
      ])
      const loc = locsRes.find(l => l.label === data.label)
      const pallet = palsRes.find(p => p.location_id === loc?.id)

      if (!pallet) {
        setDetailLoading(false)
        setDetailError('ไม่พบพาเลทในตำแหน่งนี้')
        return
      }

      const detail = await getPalletDetail(pallet.id)
      setSelectedPallet(pallet)
      setDetailItems(detail.items || [])
    } catch (e) {
      setDetailError(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleDeductInline(item) {
    setDeductError('')
    setDeductModalItem(item)
  }

  async function confirmDeductInline(inputQty) {
    const qty = Number(inputQty)

    if (!inputQty || isNaN(qty) || qty <= 0) {
      setDeductError('กรุณากรอกจำนวนที่ต้องการหยิบออกให้ถูกต้อง')
      return
    }

    if (deductModalItem && qty > Number(deductModalItem.qty || 0)) {
      setDeductError(`จำนวนที่กรอกเกินคงเหลือ (${deductModalItem.qty})`)
      return
    }

    setDeductLoading(true)
    setDeductError('')
    try {
      const res = await deductItem(deductModalItem.id, {
        qty,
        actor_name: profile?.displayName,
        actor_user_id: profile?.userId,
      })

      setDeductModalItem(null)
      setActionToast({ type: 'success', text: res?.message || 'หยิบสินค้าออกเรียบร้อย' })
      await loadMap()

      if (selected?.label) {
        await handleCellClick(selected)
      }
    } catch (e) {
      setDeductError(e.message || 'ไม่สามารถหยิบสินค้าออกได้')
    } finally {
      setDeductLoading(false)
    }
  }

  function openAddModal() {
    setAddError('')
    setAddForm({ item_code: '', item_name: '', qty: '1' })
    setAddModalOpen(true)
  }

  async function handleAddSubmit() {
    if (!selectedPallet?.id) {
      setAddError('ไม่พบพาเลทของตำแหน่งนี้')
      return
    }

    if (!addForm.item_code || !addForm.item_name) {
      setAddError('กรุณาเลือกสินค้า')
      return
    }

    const qty = Number(addForm.qty)
    if (!addForm.qty || Number.isNaN(qty) || qty <= 0) {
      setAddError('กรุณากรอกจำนวนเป็นตัวเลขที่ถูกต้อง')
      return
    }

    setAddLoading(true)
    setAddError('')
    try {
      const res = await addItem({
        pallet_id: selectedPallet.id,
        item_code: addForm.item_code,
        item_name: addForm.item_name,
        qty,
        actor_name: profile?.displayName,
        actor_user_id: profile?.userId,
      })

      setAddModalOpen(false)
      setAddForm({ item_code: '', item_name: '', qty: '1' })
      setActionToast({
        type: 'success',
        text: res?.message || `เพิ่มสินค้าในพาเลทหรือตู้คอน ${selected.label} เรียบร้อย`,
      })

      await loadMap()
      if (selected?.label) {
        await handleCellClick(selected)
      }
    } catch (e) {
      setAddError(e.message || 'ไม่สามารถเพิ่มสินค้าได้')
    } finally {
      setAddLoading(false)
    }
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
    const active = selected?.label === data.label

    return (
      <div
        onClick={() => handleCellClick(data)}
        style={{
          ...cs.cell,
          background: active ? '#e6f4ff' : hasItems ? '#eef8f0' : '#fafafa',
          border: active
            ? '2px solid #1677ff'
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
    <>
      {actionToast && (
        <div style={cp.toastWrap}>
          <div style={{ ...cp.toast, ...(actionToast.type === 'success' ? cp.toastSuccess : cp.toastError) }}>
            {actionToast.text}
          </div>
        </div>
      )}

      <div style={cs.pagePopupMode}>
        <div style={cs.wrapperFull}>
          <div style={cs.headerRow}>
            <p style={cs.sectionTitle}>Container ST129</p>
            <p style={cs.sectionHint}>แตะช่องเพื่อดูรายการสินค้าแบบ popup</p>
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
      </div>

      <ContainerPopup
        selected={selected}
        selectedPallet={selectedPallet}
        detailLoading={detailLoading}
        detailError={detailError}
        detailItems={detailItems}
        onClose={() => {
          setSelected(null)
          setSelectedPallet(null)
          setDetailItems([])
          setDetailError(null)
          setDeductModalItem(null)
          setDeductError('')
          setAddModalOpen(false)
          setAddError('')
        }}
        onDeduct={handleDeductInline}
        onAdd={openAddModal}
      />

      <ConfirmDeductModal
        item={deductModalItem}
        loading={deductLoading}
        error={deductError}
        onClose={() => {
          if (deductLoading) return
          setDeductModalItem(null)
          setDeductError('')
          setAddModalOpen(false)
          setAddError('')
        }}
        onConfirm={confirmDeductInline}
      />

      <AddItemModal
        open={addModalOpen}
        selected={selected}
        selectedPallet={selectedPallet}
        form={addForm}
        loading={addLoading}
        error={addError}
        onClose={() => {
          if (addLoading) return
          setAddModalOpen(false)
          setAddError('')
        }}
        onChangeItem={selectedItem =>
          setAddForm(f => ({
            ...f,
            item_code: selectedItem?.code || '',
            item_name: selectedItem?.name || '',
          }))
        }
        onClearItem={() =>
          setAddForm(f => ({
            ...f,
            item_code: '',
            item_name: '',
          }))
        }
        onChangeQty={value =>
          setAddForm(f => ({
            ...f,
            qty: String(value).replace(/[^0-9]/g, ''),
          }))
        }
        onSubmit={handleAddSubmit}
      />
    </>
  )
}

const cs = {
  pagePopupMode: {
    height: '100%',
    overflow: 'hidden',
    padding: 8,
    boxSizing: 'border-box',
  },
  wrapperFull: {
    height: '100%',
    background: '#fff',
    borderRadius: 18,
    padding: 10,
    border: '1px solid #ececec',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 },
  sectionHint: { fontSize: 10, color: '#8d8d95', textAlign: 'right', lineHeight: 1.3, maxWidth: 120 },
  groupsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'stretch' },
  groupCard: { background: '#f8f8f8', borderRadius: 14, padding: '8px 5px 8px', border: '1px solid #ededed', minWidth: 0 },
  groupSlots: { display: 'grid', gridTemplateColumns: '1fr', gap: 6 },
  rowPair: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 },
  slotWrap: { minWidth: 0 },
  groupLabel: { marginTop: 6, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.24em', paddingLeft: '0.24em' },
  cell: { borderRadius: 14, padding: '6px 3px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: 'clamp(62px, 11vw, 84px)', cursor: 'pointer', minWidth: 0, boxSizing: 'border-box' },
  emptyCell: { background: '#fafafa', border: '1.5px dashed #e4e4e7' },
  number: { fontSize: 'clamp(12px, 2.2vw, 16px)', fontWeight: 800, color: '#1a1a1a', lineHeight: 1 },
  labelText: { fontSize: 'clamp(6px, 1.2vw, 8px)', color: '#8f8f97', lineHeight: 1.1, marginTop: 3, textAlign: 'center', wordBreak: 'break-word' },
  count: { fontSize: 'clamp(13px, 2vw, 16px)', fontWeight: 700, color: '#16a34a', lineHeight: 1, marginTop: 4 },
  plus: { fontSize: 'clamp(12px, 2vw, 15px)', color: '#c3c3c8', lineHeight: 1, marginTop: 4 },
}

const cp = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.42)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82vh',
    background: '#fff',
    borderRadius: 24,
    border: '1px solid #e5e7eb',
    boxShadow: '0 18px 48px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderRadius: 999,
    background: '#ecfdf3',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    fontSize: 11,
    fontWeight: 700,
  },
  title: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  sub: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    padding: '12px 16px 0',
  },
  summaryCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: '10px 12px',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  addWrap: {
    padding: '12px 16px 10px',
  },
  addBtn: {
    width: '100%',
    border: 'none',
    borderRadius: 16,
    background: '#111827',
    color: '#fff',
    padding: '13px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    background: '#f8fafc',
    padding: '10px 16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  itemCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  itemQtyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: 8,
    padding: '6px 10px',
    borderRadius: 999,
    background: '#ecfdf3',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    fontSize: 12,
    fontWeight: 700,
  },
  deductBtn: {
    flexShrink: 0,
    alignSelf: 'center',
    border: 'none',
    borderRadius: 14,
    background: '#dc2626',
    color: '#fff',
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: 88,
  },
  emptyWrap: {
    padding: '28px 16px 32px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#334155',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#94a3b8',
  },
  footer: {
    borderTop: '1px solid #f1f5f9',
    padding: 16,
    background: '#fff',
  },
  footerCloseBtn: {
    width: '100%',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#334155',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  toastWrap: {
    position: 'fixed',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 280,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    padding: '0 16px',
  },
  toast: {
    maxWidth: 340,
    width: '100%',
    borderRadius: 16,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    textAlign: 'center',
  },
  toastSuccess: {
    background: '#ecfdf3',
    border: '1px solid #bbf7d0',
    color: '#15803d',
  },
  toastError: {
    background: '#fff1f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
  },
}

const dm = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 260,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    background: '#fff',
    borderRadius: 26,
    border: '1px solid #e2e8f0',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderRadius: 999,
    background: '#fff1f2',
    color: '#be123c',
    border: '1px solid #fecdd3',
    fontSize: 11,
    fontWeight: 700,
  },
  title: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.45,
  },
  body: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  itemBox: {
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    padding: 12,
  },
  itemCode: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.04em',
  },
  itemName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.45,
    color: '#0f172a',
  },
  itemQty: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: 10,
    padding: '6px 10px',
    borderRadius: 999,
    background: '#ecfdf3',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    fontSize: 12,
    fontWeight: 700,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: '#334155',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    background: '#fff',
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    outline: 'none',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
  },
  errorBox: {
    borderRadius: 16,
    border: '1px solid #fecaca',
    background: '#fff1f2',
    color: '#dc2626',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    padding: 16,
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmBtn: {
    borderRadius: 16,
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(220, 38, 38, 0.22)',
  },
}


const am = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.3)',
    backdropFilter: 'blur(1px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 270,
  },
  card: {
    width: '100%',
    maxWidth: 336,
    maxHeight: '84vh',
    background: '#fff',
    borderRadius: 26,
    border: '1px solid #e2e8f0',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderRadius: 999,
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #e2e8f0',
    fontSize: 11,
    fontWeight: 700,
  },
  title: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.45,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  body: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    overflowY: 'auto',
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: '#334155',
  },
  helper: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  selectedBox: {
    borderRadius: 18,
    border: '1px solid #dbeafe',
    background: '#f0f9ff',
    padding: 12,
  },
  selectedCode: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.04em',
  },
  selectedName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.45,
  },
  selectedHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    background: '#fff',
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    outline: 'none',
  },
  errorBox: {
    borderRadius: 16,
    border: '1px solid #fecaca',
    background: '#fff1f2',
    color: '#dc2626',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    padding: 16,
    borderTop: '1px solid #f1f5f9',
    background: '#fff',
  },
  cancelBtn: {
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmBtn: {
    borderRadius: 16,
    border: 'none',
    background: '#111827',
    color: '#fff',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(17, 24, 39, 0.18)',
  },
}

export default function MapPage({ profile }) {
  const [activeZone, setActiveZone] = useState('tent')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeZone === 'tent'
          ? <TentMap profile={profile} />
          : <ContainerMap profile={profile} />
        }
      </div>
    </div>
  )
}
