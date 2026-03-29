export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, phone } = req.body;

  const response = await fetch('https://api.moyasar.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(process.env.MOYASAR_SECRET_KEY + ':').toString('base64'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
  amount: amount * 100,
  currency: 'SAR',
  description: 'اشتراك منصة أعراف',
  callback_url: 'https://your-site.vercel.app/success.html',
  metadata: {
    phone: phone
  },
  source: {
    type: 'creditcard'
  }
})
  });

  const data = await response.json();

  res.status(200).json(data);
}
