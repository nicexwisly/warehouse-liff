// datetime.js

export function formatDateTimeTH(dateStr) {
  if (!dateStr) return '-'

  try {
    const date = new Date(dateStr)

    return date.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (err) {
    console.error('formatDateTimeTH error:', err)
    return '-'
  }
}