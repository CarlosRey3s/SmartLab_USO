const payload = {
  "desde": "09:00",
  "equipos": [],
  "estaciones": [2],
  "fecha": "2026-07-09",
  "hasta": "11:00",
  "laboratorio": "1",
  "numPersonas": 4,
  "recurrencia": "No se repite",
  "tipo": "reserva",
  "titulo": "PRUEBA III"
};

fetch('http://localhost:4000/api/actividades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(res => console.log(JSON.stringify(res, null, 2)))
.catch(err => console.error(err));
