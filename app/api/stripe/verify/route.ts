import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    // Get line items to determine what was purchased
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId)
    const priceId = lineItems.data[0]?.price?.id

    // Determine credits based on price ID
    let credits = 0
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER) {
      credits = 10
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED) {
      credits = -1 // Unlimited marker
    }

    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_email,
      credits,
    })
  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    )
  }
}
