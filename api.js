const BASE = import.meta.env.VITE_API_URL

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'เกิดข้อผิดพลาด')
  }
  return res.json()
}

// Items
export const searchItems = (q) => request(`/items/search?q=${encodeURIComponent(q)}`)
export const addItem = (data) => request('/items', { method: 'POST', body: JSON.stringify(data) })
export const moveItem = (id, data) => request(`/items/${id}/move`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteItem = (id) => request(`/items/${id}`, { method: 'DELETE' })

// Pallets
export const getPalletDetail = (id) => request(`/pallets/${id}`)
export const createPallet = (data) => request('/pallets', { method: 'POST', body: JSON.stringify(data) })

// Locations
export const getMap = () => request('/locations/map')
export const getLocations = () => request('/locations')

// History
export const getRecentHistory = (limit = 30) => request(`/history/recent?limit=${limit}`)
export const getItemHistory = (itemId) => request(`/history/item/${itemId}`)

export const deductItem = (id, data) => request(`/items/${id}/deduct`, { method: 'PATCH', body: JSON.stringify(data) })
