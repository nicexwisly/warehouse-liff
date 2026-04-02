import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

/**
 * BarcodeScanner component
 * รองรับทั้ง barcode 1D (EAN-13, Code128 ฯลฯ) และ QR Code
 * 
 * Props:
 *   onResult(value: string) — callback เมื่อสแกนได้
 *   onClose()               — callback เมื่อกดปิด
 */
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
          facingMode: 'environment',   // กล้องหลัง
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
        // NotFoundException = ยังหา barcode ไม่เจอ (ปกติ) ไม่ต้องแสดง error
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
        {/* Header */}
        <div style={styles.header}>
          <p style={styles.title}>สแกน Barcode</p>
          <button onClick={() => { readerRef.current?.reset(); onClose() }} style={styles.closeBtn}>✕</button>
        </div>

        {/* Camera view */}
        <div style={styles.videoWrapper}>
          <video ref={videoRef} style={styles.video} autoPlay playsInline muted />
          {/* เส้นไกด์ตรงกลาง */}
          <div style={styles.guide}>
            <div style={styles.guideLine} />
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {scanning && !error && <p style={styles.hint}>จ่อ barcode ให้อยู่ในกรอบ</p>}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: '#000', zIndex: 200,
    display: 'flex', flexDirection: 'column',
  },
  container: {
    display: 'flex', flexDirection: 'column', height: '100%',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: '#111',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: 600 },
  closeBtn: {
    background: '#333', border: 'none', color: '#fff',
    borderRadius: 20, width: 32, height: 32, fontSize: 14, cursor: 'pointer',
  },
  videoWrapper: {
    flex: 1, position: 'relative', overflow: 'hidden',
  },
  video: {
    width: '100%', height: '100%', objectFit: 'cover',
  },
  guide: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  guideLine: {
    width: '80%', height: 2,
    background: 'rgba(6, 199, 85, 0.8)',
    boxShadow: '0 0 8px rgba(6, 199, 85, 0.8)',
  },
  hint: {
    color: '#aaa', fontSize: 13, textAlign: 'center',
    padding: '12px', background: '#111',
  },
  error: {
    color: '#e53e3e', fontSize: 13, textAlign: 'center',
    padding: '12px', background: '#111',
  },
}
