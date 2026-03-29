export default async function handler(req, res) {
console.log('METHOD:', req.method);
  try {
    const { amount, phone } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({ error: 'amount and phone are required' });
    }

    const response = await fetch('https://api.moyasar.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.MOYASAR_SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amount) * 100,
        currency: 'SAR',
        description: 'اشتراك منصة أعراف',
        callback_url: 'https://araf-site-main.vercel.app/success.html',
        metadata: {
          phone: phone
        },
        source: {
          type: 'creditcard',
          name: 'Test User',
          number: '4111111111111111',
          cvc: '123',
          month: 12,
          year: 2027
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Moyasar error',
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Server error'
    });
  }
}
