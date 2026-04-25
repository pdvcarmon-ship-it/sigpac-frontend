# SIGPAC Sentinel Frontend

Visor de mapas con índices espectrales Sentinel-2. Next.js + React-Leaflet.

## 🚀 Deploy en Vercel

1. Sube este directorio a un repositorio GitHub
2. Ve a [vercel.com](https://vercel.com) → New Project
3. Importa tu repo
4. Añade la variable de entorno:
   - `NEXT_PUBLIC_BACKEND_URL` → URL de tu backend en Render (ej: `https://sigpac-backend.onrender.com`)
5. Deploy automático en cada push

## 🖥️ Local

```bash
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 npm run dev
# Abre http://localhost:3000
```

## 🗺️ Funcionalidades

- **Mapa base** oscuro (CartoDB Dark)
- **Toggle satélite** (Esri World Imagery)
- **Carga parcelas SIGPAC** por provincia/municipio/polígono/parcela
- **Búsqueda imágenes Sentinel-2** por fecha y nubosidad
- **5 índices**: NDVI, NDWI, EVI, NDRE, SAVI
- **Overlay resultado** sobre el mapa con estadísticas
- **Modo DEMO** funciona sin credenciales Copernicus

## ⚙️ Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | URL del backend FastAPI | `https://tu-app.onrender.com` |

## 🔗 Flujo de uso

1. Introduce coordenadas SIGPAC de la parcela
2. Pulsa **Cargar Parcela** → aparece en el mapa
3. Selecciona rango de fechas → **Buscar Imágenes**
4. Elige imagen Sentinel disponible
5. Selecciona índice (NDVI, NDWI, EVI...)
6. Pulsa **Calcular** → el backend procesa y devuelve la imagen
7. El overlay aparece sobre la parcela en el mapa
