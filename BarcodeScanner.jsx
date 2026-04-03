import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { theme } from './theme'

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      videoRef.current,
      (result, err) => {
        if (result) {
          setScanning(false)
          reader.reset()
          onResult(result.getText())
        }
        if (err && !(err instanceof NotFoundException)) {
          console.error('Scanner error:', err)
        }
      }
    ).catch(e => {
      setError('ไม่สามารถเปิดกล้องได้: ' + e.message)
    })

    return () => {
      reader.reset()
    }
  }, [])

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <p style={styles.title}>สแกน Barcode</p>
          <button onClick={() => { readerRef.current?.reset(); onClose() }} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.videoWrapper}>
          <video ref={videoRef} style={styles.video} autoPlay playsInline muted />
          <div style={styles.guide}><div style={styles.guideLine} /></div>
        </div>
        {error && <p style={styles.error}>{error}</p>}
        {scanning && !error && <p style={styles.hint}>จ่อ barcode ให้อยู่ในกรอบ</p>}
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,20,22,0.82)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  container: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: 560, background: '#0f1012' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1b1c1f', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  title: { color: '#fff', fontSize: 16, fontWeight: 600 },
  closeBtn: { background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 999, width: 32, height: 32, fontSize: 14, cursor: 'pointer' },
  videoWrapper: { flex: 1, position: 'relative', overflow: 'hidden' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  guide: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  guideLine: { width: '80%', height: 2, background: theme.blue, boxShadow: `0 0 10px ${theme.blue}` },
  hint: { color: '#c7c7cc', fontSize: 13, textAlign: 'center', padding: '12px', background: '#1b1c1f' },
  error: { color: '#ff8b86', fontSize: 13, textAlign: 'center', padding: '12px', background: '#1b1c1f' },
}
