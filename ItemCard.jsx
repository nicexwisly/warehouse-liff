export default function ItemCard({ item, onClick }) {
  return (
    <div onClick={onClick} style={styles.card}>
      <div style={styles.left}>
        <span style={styles.name}>{item.item_name}</span>
        <span style={styles.code}>{item.item_code}</span>
      </div>
      <div style={styles.right}>
        <span style={styles.location}>{item.location_label}</span>
        <span style={styles.qty}>{item.qty} {item.unit || 'ชิ้น'}</span>
      </div>
    </div>
  )
}

const styles = {
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer' },
  left: { display: 'flex', flexDirection: 'column', gap: 4 },
  name: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  code: { fontSize: 12, color: '#888' },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  location: { fontSize: 13, fontWeight: 700, color: '#06c755', background: '#e6faf0', padding: '2px 8px', borderRadius: 6 },
  qty: { fontSize: 12, color: '#666' },
}
