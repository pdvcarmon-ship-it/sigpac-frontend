'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  parcGeojson: any
  imagenUrl: string | null
  indice: string
  indiceColor: string
}

export default function MapView({ parcGeojson, imagenUrl, indice, indiceColor }: Props) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const parcelaLayerRef = useRef<any>(null)
  const imagenLayerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [40.4, -3.7],
        zoom: 6,
        zoomControl: false,
      })

      // Capa base oscura (CartoDB Dark)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '©OpenStreetMap ©CartoDB',
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map)

      // Capa satélite opcional (toggle)
      const satelite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '©Esri', maxZoom: 18, opacity: 0.6 }
      )

      // Control de zoom
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Control escala
      L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map)

      // Toggle satélite
      const SateliteControl = L.Control.extend({
        onAdd: () => {
          const btn = L.DomUtil.create('button', '')
          btn.innerHTML = '🛰'
          btn.title = 'Toggle satélite'
          Object.assign(btn.style, {
            background: 'rgba(17,26,20,0.9)',
            border: '1px solid #2a3d2e',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#e2ffe8',
          })
          let on = false
          btn.onclick = () => {
            on = !on
            on ? satelite.addTo(map) : map.removeLayer(satelite)
            btn.style.borderColor = on ? '#4ade80' : '#2a3d2e'
          }
          return btn
        }
      })
      new SateliteControl({ position: 'topright' }).addTo(map)

      mapInstanceRef.current = map
    }

    return () => {}
  }, [])

  // Parcela layer
  useEffect(() => {
    if (!mapInstanceRef.current || !parcGeojson) return
    const L = require('leaflet')
    const map = mapInstanceRef.current

    if (parcelaLayerRef.current) {
      map.removeLayer(parcelaLayerRef.current)
    }

    const layer = L.geoJSON(parcGeojson, {
      style: {
        color: indiceColor,
        weight: 2,
        fillColor: indiceColor,
        fillOpacity: 0.08,
        dashArray: '4 4',
      },
    }).addTo(map)

    parcelaLayerRef.current = layer

    try {
      map.fitBounds(layer.getBounds(), { padding: [40, 40] })
    } catch {}
  }, [parcGeojson, indiceColor])

  // Imagen overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const L = require('leaflet')
    const map = mapInstanceRef.current

    if (imagenLayerRef.current) {
      map.removeLayer(imagenLayerRef.current)
      imagenLayerRef.current = null
    }

    if (!imagenUrl || !parcGeojson?.features?.length) return

    const geom = parcGeojson.features[0].geometry
    const coords = geom.type === 'Polygon'
      ? geom.coordinates[0]
      : geom.coordinates[0][0]
    const lons = coords.map((c: number[]) => c[0])
    const lats = coords.map((c: number[]) => c[1])

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]

    const overlay = L.imageOverlay(imagenUrl, bounds, {
      opacity: 0.85,
      interactive: false,
    }).addTo(map)

    imagenLayerRef.current = overlay
    map.fitBounds(bounds, { padding: [30, 30] })
  }, [imagenUrl, parcGeojson])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
  )
}
