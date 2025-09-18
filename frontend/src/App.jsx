import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import api from './utils/api';
import EditableAttributeTable from './EditableAttributeTable';

function FitBounds({ geoData }) {
  const map = useMap();
  React.useEffect(() => {
    if (!geoData) return;
    const layer = L.geoJSON(geoData);
    const bounds = layer.getBounds();
    if (bounds.isValid()) { map.invalidateSize(); map.fitBounds(bounds, { maxZoom: 16 }); }
  }, [geoData, map]);
  return null;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [bufferedData, setBufferedData] = useState(null);
  const [bufferDistance, setBufferDistance] = useState(100);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!selectedFile) return;
    const form = new FormData();
    form.append('shapefile', selectedFile);
    try {
      setStatus('Subiendo...');
      const { data } = await api.post('/gis/upload/', form, { headers: {'Content-Type':'multipart/form-data'} });
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
      const { data } = await api.post('/gis/operations_shapefile/', form);
      setBufferedData(data.geojson);
      setStatus(`Buffer ${bufferDistance} m listo.`);
    } catch (err) {
      setStatus('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-3 sidebar">
          <h4>miniGIS</h4>
          <div className="mb-3">
            <label className="form-label">Subir Shapefile (.zip)</label>
            <input type="file" className="form-control" accept=".zip" onChange={e => setSelectedFile(e.target.files[0])} />
            <button className="btn btn-success mt-2" onClick={handleUpload}>Subir y mostrar</button>
          </div>
          <div className="mb-3">
            <label>Buffer (m)</label>
            <input type="number" className="form-control" value={bufferDistance} onChange={e => setBufferDistance(+e.target.value)} />
            <button className="btn btn-primary mt-2" onClick={handleBuffer}>Aplicar buffer</button>
          </div>
          <small className="text-muted">{status}</small>
        </div>
        <div className="col-md-9">
          <div className="map-wrapper mb-4">
            <MapContainer center={[0,0]} zoom={2} style={{height:'100%', width:'100%'}}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OSM Standard">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                </LayersControl.BaseLayer>
              </LayersControl>
              {geoData && <FitBounds geoData={geoData} />}
              {geoData && <GeoJSON data={geoData} />}
              {bufferedData && <GeoJSON data={bufferedData} style={{color:'#00cc00', weight:2, fillOpacity:0.2}} />}
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
