# Geocodev miniGIS (Django REST + React + Docker)

- **Backend** Django + DRF (GeoPandas con **pyogrio** para evitar problemas de GDAL).
- **Frontend** React (Vite) + Leaflet + leaflet-draw.
- **PostGIS** + Nginx (sirviendo el frontend build).
- CORS y variables por **.env**.

## Puesta en marcha (local con Docker)

```bash
git clone <TU_REPO>.git geocodev-minigis
cd geocodev-minigis
cp .env.example .env
# (opcional) edita .env con tus valores
docker compose up -d --build
# Backend: http://localhost:8000  |  Frontend: http://localhost:3000
```

## Estructura

```
backend/     # Django + DRF
frontend/    # React (Vite) + Nginx
docker-compose.yml
.env.example
```

## Notas técnicas
- GeoPandas usa **pyogrio** como engine, evitando dependencias del sistema de GDAL/Fiona.
- Para lectura de Shapefile: `gpd.read_file(path, engine="pyogrio")`.
- Para escritura de Shapefile ZIP en el backend se usa `pyogrio.write_dataframe` y luego se comprime.
- Si quieres usar tu código real, reemplaza `backend/gis_app/views.py` por tus vistas y adapta dependencias.

---

**Producción**: agrega un proxy (Traefik/Nginx), HTTPS y configura DEBUG=False + ALLOWED_HOSTS y cabeceras seguras.
Se usa docker-compose.prod.yml + Caddyfile
