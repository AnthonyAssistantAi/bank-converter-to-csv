import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get the price ID from the session
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        const priceId = lineItems.data[0]?.price?.id

        // Determine credits based on price ID
        let credits = 0
        let isSubscription = false

        if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER) {
          credits = 10
          isSubscription = false
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED) {
          credits = -1 // Unlimited marker
          isSubscription = true
        }

        // TODO: Save to database
        // For now, we'll store in a simple way
        console.log('Payment successful:', {
          sessionId: session.id,
          customerEmail: session.customer_email,
          credits,
          isSubscription,
        })

        break
      }

      case 'invoice.paid': {
        // Handle subscription renewal
        const invoice = event.data.object as Stripe.Invoice
        console.log('Subscription renewed:', invoice.id)
        break
      }

      case 'customer.subscription.deleted': {
        // Handle cancellation
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription cancelled:', subscription.id)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
