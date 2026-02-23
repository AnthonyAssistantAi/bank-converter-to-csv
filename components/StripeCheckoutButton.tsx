'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface StripeCheckoutButtonProps {
  priceId: string
  children: React.ReactNode
  className?: string
}

export function StripeCheckoutButton({ priceId, children, className }: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!stripePromise) {
      alert('Stripe is not configured. Please contact support.')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId } = await response.json()
      
      const stripe = await stripePromise
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={className}
      style={{ 
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'block',
        width: '100%'
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
