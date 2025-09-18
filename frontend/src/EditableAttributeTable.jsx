import React from 'react';
export default function EditableAttributeTable({ geoData, setGeoData }) {
  if (!geoData) return null;
  const fields = Object.keys(geoData.features?.[0]?.properties || {});
  const handleChange = (i, field, value) => {
    const next = JSON.parse(JSON.stringify(geoData));
    next.features[i].properties[field] = value;
    setGeoData(next);
  };
  return (
    <div className="table-responsive">
      <table className="table table-sm table-striped">
        <thead><tr><th>#</th>{fields.map(f => <th key={f}>{f}</th>)}</tr></thead>
        <tbody>
          {geoData.features.map((f,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              {fields.map(field => (
                <td key={field}>
                  <input className="form-control form-control-sm"
                         value={f.properties[field] ?? ''}
                         onChange={e => handleChange(i, field, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
