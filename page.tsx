'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'

const MapView = dynamic(() => import('./components/MapView'), { ssr: false })

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const INDICES = [
  { id: 'NDVI', label: 'NDVI', desc: 'Vegetación', color: '#4ade80' },
  { id: 'NDWI', label: 'NDWI', desc: 'Agua', color: '#22d3ee' },
  { id: 'EVI',  label: 'EVI',  desc: 'Veg. Avanzada', color: '#86efac' },
  { id: 'NDRE', label: 'NDRE', desc: 'Red Edge', color: '#a3e635' },
  { id: 'SAVI', label: 'SAVI', desc: 'Suelo ajust.', color: '#fde68a' },
]

type Estado = 'idle' | 'loading' | 'done' | 'error'

interface Stats {
  min: number; max: number; mean: number; std: number; modo?: string
}

export default function Home() {
  const [indice, setIndice] = useState('NDVI')
  const [estado, setEstado] = useState<Estado>('idle')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const [parcela, setParcela] = useState({ provincia: '28', municipio: '079', poligono: '1', parcela: '1' })
  const [fechaInicio, setFechaInicio] = useState('2024-05-01')
  const [fechaFin, setFechaFin] = useState('2024-06-30')
  const [productos, setProductos] = useState<any[]>([])
  const [productoSel, setProductoSel] = useState('')
  const [parcGeojson, setParcGeojson] = useState<any>(null)
  const [buscando, setBuscando] = useState(false)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`${BACKEND}/health`)
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false))
  }, [])

  const buscarParcela = async () => {
    setError('')
    setBuscando(true)
    try {
      const url = `${BACKEND}/sigpac/parcela?provincia=${parcela.provincia}&municipio=${parcela.municipio}&poligono=${parcela.poligono}&parcela=${parcela.parcela}`
      const r = await fetch(url)
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const data = await r.json()
      setParcGeojson(data)
    } catch (e: any) {
      setError('No se pudo cargar la parcela SIGPAC: ' + e.message)
    } finally {
      setBuscando(false)
    }
  }

  const buscarImagenes = async () => {
    if (!parcGeojson?.features?.length) {
      setError('Primero carga una parcela SIGPAC')
      return
    }
    setError('')
    setProductos([])
    setBuscando(true)
    try {
      const geom = parcGeojson.features[0].geometry
      const coords = geom.type === 'Polygon'
        ? geom.coordinates[0]
        : geom.coordinates[0][0]
      const lons = coords.map((c: number[]) => c[0])
      const lats = coords.map((c: number[]) => c[1])
      const bbox = `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`
      const url = `${BACKEND}/sentinel/buscar?bbox=${bbox}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&max_nubosidad=30`
      const r = await fetch(url)
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const data = await r.json()
      setProductos(data.productos || [])
      if (data.productos?.length) setProductoSel(data.productos[0].id)
    } catch (e: any) {
      setError('Error buscando imágenes: ' + e.message)
    } finally {
      setBuscando(false)
    }
  }

  const calcular = async () => {
    if (!productoSel) { setError('Selecciona una imagen Sentinel'); return }
    setEstado('loading')
    setError('')
    setImagenUrl(null)
    setStats(null)

    try {
      let bbox = undefined
      if (parcGeojson?.features?.length) {
        const geom = parcGeojson.features[0].geometry
        const coords = geom.type === 'Polygon'
          ? geom.coordinates[0]
          : geom.coordinates[0][0]
        const lons = coords.map((c: number[]) => c[0])
        const lats = coords.map((c: number[]) => c[1])
        bbox = `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`
      }

      const bboxParam = bbox ? `&bbox=${bbox}` : ''
      const statsUrl = `${BACKEND}/indice/calcular?producto_id=${productoSel}&indice=${indice}${bboxParam}&formato=stats`
      const imgUrl = `${BACKEND}/indice/calcular?producto_id=${productoSel}&indice=${indice}${bboxParam}&formato=png`

      const [sr, ir] = await Promise.all([fetch(statsUrl), fetch(imgUrl)])
      if (!sr.ok || !ir.ok) throw new Error('Error calculando índice')

      const statsData = await sr.json()
      setStats(statsData)

      const blob = await ir.blob()
      setImagenUrl(URL.createObjectURL(blob))
      setEstado('done')
    } catch (e: any) {
      setEstado('error')
      setError('Error al calcular: ' + e.message)
    }
  }

  const indiceActual = INDICES.find(i => i.id === indice)!

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 300,
        height: '100vh',
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
      }}>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', letterSpacing: '0.05em' }}>
              SIGPAC · SENTINEL
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Visor de índices espectrales
          </p>
        </div>

        {/* Backend status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={backendOk ? 'pulse' : ''} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: backendOk === null ? '#6b8f72' : backendOk ? '#4ade80' : '#f87171',
            display: 'inline-block'
          }}/>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {backendOk === null ? 'CONECTANDO...' : backendOk ? 'BACKEND OK' : 'BACKEND OFFLINE'}
          </span>
        </div>

        <hr style={{ borderColor: 'var(--border)', borderWidth: '0 0 1px 0' }} />

        {/* SIGPAC */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em' }}>
              01 · PARCELA SIGPAC
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            {[
              { key: 'provincia', label: 'Provincia' },
              { key: 'municipio', label: 'Municipio' },
              { key: 'poligono',  label: 'Polígono' },
              { key: 'parcela',   label: 'Parcela' },
            ].map(f => (
              <div key={f.key}>
                <label className="lbl">{f.label}</label>
                <input
                  className="field"
                  type="number"
                  value={(parcela as any)[f.key]}
                  onChange={e => setParcela(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ fontSize: 13 }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={buscarParcela}
            disabled={buscando}
            style={{
              width: '100%', padding: '8px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--accent)',
              color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font-mono)',
              cursor: buscando ? 'wait' : 'pointer', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {buscando ? <><span className="spinner" style={{width:14,height:14}}/> CARGANDO...</> : '⬡ CARGAR PARCELA'}
          </button>

          {parcGeojson && (
            <div className="tag" style={{ marginTop: 6, background: 'rgba(74,222,128,0.08)', color: 'var(--accent)', border: '1px solid rgba(74,222,128,0.2)' }}>
              ✓ Parcela cargada
            </div>
          )}
        </section>

        <hr style={{ borderColor: 'var(--border)', borderWidth: '0 0 1px 0' }} />

        {/* Fechas */}
        <section>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>
            02 · PERIODO DE BÚSQUEDA
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div>
              <label className="lbl">Desde</label>
              <input className="field" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ fontSize: 12 }}/>
            </div>
            <div>
              <label className="lbl">Hasta</label>
              <input className="field" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ fontSize: 12 }}/>
            </div>
          </div>

          <button
            onClick={buscarImagenes}
            disabled={buscando}
            style={{
              width: '100%', padding: '8px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--accent2)',
              color: 'var(--accent2)', fontSize: 12, fontFamily: 'var(--font-mono)',
              cursor: buscando ? 'wait' : 'pointer', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {buscando ? <><span className="spinner" style={{width:14,height:14}}/> BUSCANDO...</> : '◎ BUSCAR IMÁGENES'}
          </button>

          {productos.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label className="lbl">Imagen ({productos.length} encontradas)</label>
              <select
                className="field"
                value={productoSel}
                onChange={e => setProductoSel(e.target.value)}
                style={{ fontSize: 11 }}
              >
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fecha} · ☁ {p.nubosidad ?? '?'}% · {p.size_mb}MB
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <hr style={{ borderColor: 'var(--border)', borderWidth: '0 0 1px 0' }} />

        {/* Índices */}
        <section>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>
            03 · ÍNDICE ESPECTRAL
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {INDICES.map(idx => (
              <button
                key={idx.id}
                className={`idx-btn ${indice === idx.id ? 'active' : ''}`}
                onClick={() => setIndice(idx.id)}
                style={indice === idx.id ? { background: idx.color, borderColor: idx.color, color: '#0a0f0d' } : {}}
              >
                <span style={{ display: 'block', fontWeight: 700 }}>{idx.label}</span>
                <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{idx.desc}</span>
              </button>
            ))}
          </div>

          <button
            onClick={calcular}
            disabled={estado === 'loading'}
            style={{
              width: '100%', padding: '10px', borderRadius: 6,
              background: estado === 'loading' ? 'var(--surface2)' : indiceActual.color,
              border: 'none', color: '#0a0f0d',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
              cursor: estado === 'loading' ? 'wait' : 'pointer',
              letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {estado === 'loading'
              ? <><span className="spinner" style={{width:16,height:16}}/> PROCESANDO...</>
              : `▶ CALCULAR ${indice}`}
          </button>
        </section>

        {/* Stats */}
        {stats && (
          <>
            <hr style={{ borderColor: 'var(--border)', borderWidth: '0 0 1px 0' }} />
            <section>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                04 · ESTADÍSTICAS
              </span>
              {stats.modo && (
                <div className="tag" style={{ marginBottom: 8, background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontSize: 10 }}>
                  ⚠ MODO DEMO
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { k: 'min', v: stats.min.toFixed(3) },
                  { k: 'max', v: stats.max.toFixed(3) },
                  { k: 'media', v: stats.mean.toFixed(3) },
                  { k: 'desv.', v: stats.std.toFixed(3) },
                ].map(s => (
                  <div className="stat-box" key={s.k}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.k}</div>
                    <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, color: indiceActual.color, marginTop: 2 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '8px 10px', borderRadius: 6,
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#fca5a5', fontSize: 11, fontFamily: 'var(--font-mono)',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          SIGPAC WFS · Copernicus DS<br/>
          FastAPI + Rasterio + NumPy<br/>
          100% FREE & OPEN DATA
        </div>
      </aside>

      {/* MAP AREA */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView
          parcGeojson={parcGeojson}
          imagenUrl={imagenUrl}
          indice={indice}
          indiceColor={indiceActual.color}
        />

        {/* Overlay info */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div className="panel" style={{ padding: '6px 10px', borderRadius: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>ÍNDICE ACTIVO · </span>
            <span style={{ color: indiceActual.color, fontWeight: 700 }}>{indice}</span>
          </div>

          {estado === 'done' && (
            <div className="panel" style={{ padding: '6px 10px', borderRadius: 6 }}>
              <span style={{ color: 'var(--accent)' }}>✓ Resultado cargado</span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!imagenUrl && estado === 'idle' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none', zIndex: 500,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.15 }}>⬡</div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
              SELECCIONA PARCELA · FECHA · ÍNDICE
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
