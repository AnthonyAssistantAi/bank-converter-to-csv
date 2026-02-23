'use client'

import { useEffect, useState } from 'react'
import { Check, Download } from 'lucide-react'
import Link from 'next/link'

export default function SuccessPage() {
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    
    if (sessionId) {
      // Verify the session and get credits
      fetch(`/api/stripe/verify?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.credits) {
            // Add credits to localStorage
            const currentCredits = parseInt(localStorage.getItem('bankconvert_credits') || '0')
            const newCredits = data.credits === -1 ? 999999 : currentCredits + data.credits
            localStorage.setItem('bankconvert_credits', newCredits.toString())
            setCredits(data.credits === -1 ? 999999 : data.credits)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white border border-brand/30 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-brand" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2 text-charcoal">Payment Successful!</h1>
          <p className="text-charcoal-light mb-6">
            {loading ? 'Processing your purchase...' : 
             credits === 999999 ? 'You now have unlimited conversions!' :
             `Your account has been credited with ${credits} conversions.`}
          </p>
          
          {!loading && (
            <div className="bg-sand rounded-lg p-4 mb-6">
              <div className="text-sm text-charcoal-light mb-1">
                {credits === 999999 ? 'Plan' : 'Available Conversions'}
              </div>
              <div className="text-3xl font-bold text-brand">
                {credits === 999999 ? 'Unlimited' : credits}
              </div>
            </div>
          )}
          
          <Link
            href="/"
            className="inline-flex items-center gap-2 w-full justify-center py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors"
          >
            <Download className="w-4 h-4" />
            Start Converting
          </Link>
        </div>
      </div>
    </div>
  )
}
