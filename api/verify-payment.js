import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { payment_id } = req.body

  if (!payment_id) {
    return res.status(400).json({ error: 'payment_id is required' })
  }

  try {
    const moyasarRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.MOYASAR_SECRET_KEY + ':').toString('base64')
      }
    })

    const payment = await moyasarRes.json()

    if (!moyasarRes.ok) {
      return res.status(400).json({ error: payment.message || 'Failed to verify payment' })
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed', payment })
    }

    if (payment.amount !== 3900 || payment.currency !== 'SAR') {
      return res.status(400).json({ error: 'Payment amount mismatch', payment })
    }

    const phone = payment.metadata?.phone

    if (!phone) {
      return res.status(400).json({ error: 'Phone not found in payment metadata' })
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        payment_id: payment.id
      })
      .eq('phone', phone)
      .eq('status', 'pending')

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription activated'
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
