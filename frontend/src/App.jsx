import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet.draw (JS + CSS)
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import api from './utils/api';
import EditableAttributeTable from './EditableAttributeTable';

import tokml from 'tokml';
import JSZip from 'jszip';

// (Fix iconos de marcador en ciertos bundlers)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function FitBounds({ geoData }) {
  const map = useMap();
  useEffect(() => {
    if (!geoData) return;
    const layer = L.geoJSON(geoData);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.invalidateSize();
      map.fitBounds(bounds, { maxZoom: 16 });
    }
  }, [geoData, map]);
  return null;
}

// ---- Controles de dibujo con Leaflet.draw ----
function DrawingControls({ onChange, registerApi }) {
  const map = useMap();
  const drawnItemsRef = useRef(new L.FeatureGroup());

  useEffect(() => {
    map.addLayer(drawnItemsRef.current);

    // Configurar controles de dibujo y edición
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
        selectedPathOptions: { maintainColor: true } 
      },
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        polyline: true,
        rectangle: true,
        circle: false,       
        circlemarker: false, // desactivado
        marker: true,
      },
    });

    map.addControl(drawControl);

    const update = () => {
      const fc = drawnItemsRef.current.toGeoJSON();
      const featureCollection = {
        type: 'FeatureCollection',
        features: Array.isArray(fc.features) ? fc.features : [],
      };
      onChange?.(featureCollection);
    };

    // Eventos de creación/edición/borrado
    const onCreated = (e) => {
      drawnItemsRef.current.addLayer(e.layer);
      update();
    };
    const onEdited = () => update();
    const onDeleted = () => update();

    map.on(L.Draw.Event.CREATED, onCreated);
    map.on(L.Draw.Event.EDITED, onEdited);
    map.on(L.Draw.Event.DELETED, onDeleted);

    registerApi?.({
      clear: () => {
        drawnItemsRef.current.clearLayers();
        update();
      },
    });

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      map.off(L.Draw.Event.EDITED, onEdited);
      map.off(L.Draw.Event.DELETED, onDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawnItemsRef.current);
    };
  }, [map, onChange, registerApi]);

  return null;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [bufferedData, setBufferedData] = useState(null);
  const [bufferDistance, setBufferDistance] = useState(100);
  const [status, setStatus] = useState('');

  // Estado y API para dibujos
  const [drawnFC, setDrawnFC] = useState({ type: 'FeatureCollection', features: [] });
  const drawApiRef = useRef(null);
  const registerDrawApi = (api) => { drawApiRef.current = api; };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const form = new FormData();
    form.append('shapefile', selectedFile);
    try {
      setStatus('Subiendo...');
      const { data } = await api.post('/upload/', form, { headers: {'Content-Type':'multipart/form-data'} });
      setGeoData(data);
      setStatus('Cargado.');
    } catch (err) {
      setStatus('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBuffer = async () => {
    if (!selectedFile) return alert('Carga un ZIP primero.');
    const form = new FormData();
    form.append('shapefile', selectedFile);
    form.append('buffer_distance', bufferDistance);
    try {
      setStatus('Procesando buffer...');
      const { data } = await api.post('/operations_shapefile/', form);
      setBufferedData(data.geojson);
      setStatus(`Buffer ${bufferDistance} m listo.`);
    } catch (err) {
      setStatus('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const downloadGeoJSON = () => {
    if (!drawnFC || !drawnFC.features?.length) {
      return alert('No hay dibujos para exportar.');
    }
    const blob = new Blob([JSON.stringify(drawnFC, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dibujos.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadKMZ = async () => {
    if (!drawnFC || !drawnFC.features?.length) {
      return alert('No hay dibujos para exportar.');
    }

    // Limpia props a primitivos
    const cleanFC = {
      type: 'FeatureCollection',
      features: drawnFC.features.map(f => ({
        ...f,
        properties: Object.fromEntries(
          Object.entries(f.properties || {}).map(([k, v]) => [k, (v !== null && typeof v === 'object') ? String(v) : v])
        )
      })),
    };

    const kml = tokml(cleanFC, {
      documentName: 'miniGIS export',
      simplestyle: true,
    });

    const zip = new JSZip();
    zip.file('doc.kml', kml);
    const kmzBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    const url = URL.createObjectURL(kmzBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dibujos.kmz';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearDrawings = () => {
    drawApiRef.current?.clear?.();
  };

  return (
    <div className="container-fluid">
      <div className="row" style={{height:'100vh'}}>
        <div className="col-md-3 sidebar" style={{overflowY:'auto', padding:'1rem'}}>
          <h4>miniGIS</h4>

          <div className="mb-3">
            <label className="form-label">Subir Shapefile (.zip)</label>
            <input
              type="file"
              className="form-control"
              accept=".zip"
              onChange={e => setSelectedFile(e.target.files[0])}
            />
            <button className="btn btn-success mt-2 w-100" onClick={handleUpload}>Subir y mostrar</button>
          </div>

          <div className="mb-3">
            <label>Buffer (m)</label>
            <input
              type="number"
              className="form-control"
              value={bufferDistance}
              onChange={e => setBufferDistance(+e.target.value)}
            />
            <button className="btn btn-primary mt-2 w-100" onClick={handleBuffer}>Aplicar buffer</button>
          </div>

          <hr />

          <h6>Dibujar en el mapa</h6>
          <p className="text-muted" style={{fontSize: '0.9rem'}}>
            Usa la barra de dibujo (arriba a la izquierda) para crear puntos, líneas o polígonos.
          </p>
          <div className="d-grid gap-2">
            <button className="btn btn-outline-secondary" onClick={downloadGeoJSON}>Descargar GeoJSON</button>
            <button className="btn btn-outline-secondary" onClick={downloadKMZ}>Descargar kmz </button>
            <button className="btn btn-outline-danger" onClick={clearDrawings}>Borrar dibujos</button>
          </div>

          <small className="text-muted d-block mt-3">{status}</small>
        </div>

        <div className="col-md-9" style={{height:'100%', padding:'1rem'}}>
          <div className="map-wrapper mb-4" style={{height:'60vh', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.1)'}}>
            <MapContainer center={[0,0]} zoom={2} style={{height:'100%', width:'100%'}}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OSM Standard">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* Controles de dibujo */}
              <DrawingControls onChange={setDrawnFC} registerApi={registerDrawApi} />

              {/* Vista de tus datos subidos */}
              {geoData && <FitBounds geoData={geoData} />}
              {geoData && <GeoJSON data={geoData} />}

              {/* Vista del buffer */}
              {bufferedData && <GeoJSON data={bufferedData} style={{ color:'#00cc00', weight:2, fillOpacity:0.2 }} />}
            </MapContainer>
          </div>

          {geoData && (
            <div className="mb-5">
              <h5>Tabla de atributos</h5>
              <EditableAttributeTable geoData={geoData} setGeoData={setGeoData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

