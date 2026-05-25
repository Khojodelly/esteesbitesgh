const fs = require('fs');
const jwt = require('jsonwebtoken');
const fetch = global.fetch;
const FormData = globalThis.FormData;

const envText = fs.readFileSync('../.env', 'utf-8');
const env = envText.split(/\r?\n/).reduce((acc, line) => {
  const [k, ...rest] = line.split('=');
  if (k) acc[k] = rest.join('=');
  return acc;
}, {});

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'admin' }, env.JWT_SECRET, { expiresIn: '7d' });

const form = new FormData();
form.append('name', 'Test Meal');
form.append('price', '99');
form.append('category', 'rice');
form.append('image', fs.createReadStream('../images/pizza.jpg'));

fetch('http://localhost:5000/api/admin/meals', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
})
  .then(async (res) => {
    console.log('STATUS', res.status);
    const text = await res.text();
    console.log(text);
  })
  .catch((err) => {
    console.error('ERROR', err);
  });
