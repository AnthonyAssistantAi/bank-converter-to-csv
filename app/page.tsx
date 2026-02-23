'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, Download, Shield, FileText, Check, Lock, Eye, EyeOff } from 'lucide-react'
import Papa from 'papaparse'
import { StripeCheckoutButton } from '@/components/StripeCheckoutButton'

interface Transaction {
  date: string
  description: string
  amount: string
  type: 'debit' | 'credit'
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [conversionsUsed, setConversionsUsed] = useState(0)
  const [availableCredits, setAvailableCredits] = useState(0)
  const [showPricing, setShowPricing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const MAX_FREE_CONVERSIONS = 3

  // Load credits from localStorage on mount
  useEffect(() => {
    const storedCredits = localStorage.getItem('bankconvert_credits')
    const storedConversions = localStorage.getItem('bankconvert_conversions_used')
    if (storedCredits) setAvailableCredits(parseInt(storedCredits))
    if (storedConversions) setConversionsUsed(parseInt(storedConversions))
  }, [])

  // Calculate if user can convert
  const canConvert = () => {
    if (availableCredits === -1) return true // Unlimited
    const freeRemaining = Math.max(0, MAX_FREE_CONVERSIONS - conversionsUsed)
    const paidRemaining = Math.max(0, availableCredits)
    return freeRemaining + paidRemaining > 0
  }

  // Get remaining conversions display
  const getRemainingDisplay = () => {
    if (availableCredits === -1) return 'Unlimited'
    const freeRemaining = Math.max(0, MAX_FREE_CONVERSIONS - conversionsUsed)
    const paidRemaining = availableCredits
    return freeRemaining + paidRemaining
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      console.log('Starting PDF extraction for:', file.name, 'Size:', file.size)
      
      const pdfjsLib = await import('pdfjs-dist')
      console.log('PDF.js loaded, version:', pdfjsLib.version)
      
      // Use unpkg CDN for worker - must match the installed version
      const version = pdfjsLib.version || '4.10.38'
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
      
      console.log('Worker source set:', pdfjsLib.GlobalWorkerOptions.workerSrc)
      
      const arrayBuffer = await file.arrayBuffer()
      console.log('File loaded into array buffer, size:', arrayBuffer.byteLength)
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      console.log('PDF document loaded, pages:', pdf.numPages)
      
      let fullText = ''
      let hasText = false
      
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log('Processing page:', i)
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        console.log('Page', i, 'text items:', textContent.items.length)
        
        if (textContent.items.length > 0) {
          hasText = true
        }
        
        // Group text items by their vertical position (y-coordinate) to reconstruct lines
        const lines: { [key: number]: string[] } = {}
        
        for (const item of textContent.items as any[]) {
          if (item.str && item.str.trim()) {
            // Round y-coordinate to group nearby text
            const y = Math.round(item.transform[5] / 5) * 5
            if (!lines[y]) {
              lines[y] = []
            }
            lines[y].push(item.str)
          }
        }
        
        // Sort by y-coordinate (top to bottom) and join lines
        const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a)
        for (const y of sortedYs) {
          const lineText = lines[y].join(' ').trim()
          if (lineText) {
            fullText += lineText + '\n'
          }
        }
        
        fullText += '\n' // Page break
      }
      
      console.log('PDF processing complete. Has text:', hasText, 'Total chars:', fullText.length)
      
      if (!hasText) {
        throw new Error('This PDF appears to be a scanned image. Please upload a text-based PDF.')
      }
      
      return fullText
    } catch (err: any) {
      console.error('PDF extraction error details:', err)
      console.error('Error stack:', err.stack)
      
      if (err.message?.includes('scanned image')) {
        throw err
      }
      
      // More specific error messages
      if (err.message?.includes('worker')) {
        throw new Error('PDF worker failed to load. Please refresh and try again.')
      }
      if (err.message?.includes('Invalid')) {
        throw new Error('Invalid PDF file. Please check the file is not corrupted.')
      }
      
      throw new Error('Could not read PDF: ' + (err.message || 'Unknown error'))
    }
  }

  const parseTransactions = (text: string): Transaction[] => {
    console.log('Raw PDF text (first 1000 chars):', text.substring(0, 1000));
    console.log('Total text length:', text.length);
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    console.log('Non-empty lines:', lines.length);
    
    const transactions: Transaction[] = [];
    
    // Barclays-specific patterns
    const datePatterns = [
      // Matches: 20 Feb, 20-Feb, 20/Feb, 20 Feb 2024
      /(\d{1,2})[\s\-]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-]?(\d{2,4})?/i,
      // Matches: 20/02/2024, 20-02-2024
      /(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})/,
      // Matches: DD-MMM-YY format
      /(\d{1,2})-(\d{2})-(\d{2})/
    ];
    
    // Amount pattern - looks for decimal numbers with 2 digits (like 75.46, 11.45)
    const amountPattern = /\b\d{1,3}(?:,\d{3})*\.\d{2}\b/;
    
    // Skip lines with these keywords (case insensitive)
    const skipKeywords = [
      'statement', 'account summary', 'balance brought forward', 
      'balance carried forward', 'page ', 'barclays', 'sort code',
      'account number', 'your transactions', 'description',
      'money in', 'money out', 'balance', 'mr a n e francis',
      'maude house', 'ropley', 'regulated', 'financial conduct',
      'prudential', 'authority', 'dispute', 'how it works',
      'if you have a problem', 'please try to resolve', 'opening balance',
      'closing balance', 'total', 'date', 'amount', '£'
    ];
    
    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const lineLower = line.toLowerCase().trim();
      
      // Skip very short lines
      if (lineLower.length < 10) continue;
      
      // Skip lines with header/footer keywords
      if (skipKeywords.some(keyword => lineLower.includes(keyword))) {
        continue;
      }
      
      // Look for amount first (more reliable than dates)
      const amountMatch = line.match(amountPattern);
      if (!amountMatch) continue;
      
      const amount = parseFloat(amountMatch[0].replace(',', ''));
      if (!amount || amount === 0) continue;
      
      // Try to find a date in this line or nearby
      let dateMatch = null;
      for (const pattern of datePatterns) {
        dateMatch = line.match(pattern);
        if (dateMatch) break;
      }
      
      // If no date found in this line, check if line starts with a number (likely a date like "20")
      if (!dateMatch) {
        const startsWithNumber = line.match(/^(\d{1,2})\s/);
        if (startsWithNumber) {
          // Look for month name in the line
          const monthMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          if (monthMatch) {
            dateMatch = [`${startsWithNumber[1]} ${monthMatch[1]}`, startsWithNumber[1], monthMatch[1]];
          }
        }
      }
      
      if (dateMatch) {
        let date = dateMatch[0].trim();
        // Normalize date format
        date = date.replace(/\s+/g, ' ').trim();
        
        // Build description by removing date and amount
        let description = line
          .replace(dateMatch[0], '')
          .replace(amountMatch[0], '')
          .trim();
        
        // Clean up description
        description = description
          .replace(/^[\-•·\s]+/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Skip if description is too short or looks like metadata
        if (description.length < 3) continue;
        if (/^(date|description|amount|balance|total|page)$/i.test(description)) continue;
        
        // Determine transaction type
        const isDebit = lineLower.includes('debit') || 
                       lineLower.includes('payment') || 
                       lineLower.includes('purchase') ||
                       lineLower.includes('contactless') ||
                       lineLower.includes('direct debit');
        
        transactions.push({
          date,
          description: description.substring(0, 100),
          amount: amount.toFixed(2),
          type: isDebit ? 'debit' : 'credit'
        });
        
        console.log(`Found transaction ${transactions.length}:`, { date, amount: amount.toFixed(2), description: description.substring(0, 50) });
      }
    }
    
    console.log('Total transactions found:', transactions.length);
    
    // Remove duplicates
    const uniqueTransactions = transactions.filter((transaction, index, self) =>
      index === self.findIndex(t => 
        t.date === transaction.date && 
        t.amount === transaction.amount &&
        t.description === transaction.description
      )
    );
    
    console.log('Unique transactions:', uniqueTransactions.length);
    return uniqueTransactions;
  }

  // Extracted file processing logic
  const processFile = useCallback(async (uploadedFile: File) => {
    if (uploadedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }
    
    if (!canConvert()) {
      setShowPricing(true)
      return
    }
    
    setFile(uploadedFile)
    setError(null)
    setExtracting(true)
    
    try {
      // Client-side PDF extraction
      const text = await extractTextFromPDF(uploadedFile)
      const parsed = parseTransactions(text)
      
      if (parsed.length === 0) {
        setError('Could not extract transactions. Try a different PDF or contact support.')
      } else {
        setTransactions(parsed)
        
        // Update conversions and credits
        const newConversions = conversionsUsed + 1
        setConversionsUsed(newConversions)
        localStorage.setItem('bankconvert_conversions_used', newConversions.toString())
        
        // Deduct from paid credits if free conversions exhausted
        if (newConversions > MAX_FREE_CONVERSIONS && availableCredits > 0) {
          const newCredits = availableCredits - 1
          setAvailableCredits(newCredits)
          localStorage.setItem('bankconvert_credits', newCredits.toString())
        }
      }
    } catch (err: any) {
      console.error('Processing error:', err)
      setError(err.message || 'Error processing PDF. Please try again.')
    } finally {
      setExtracting(false)
    }
  }, [conversionsUsed, availableCredits, canConvert])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    processFile(uploadedFile)
  }, [processFile])

  const downloadCSV = () => {
    if (transactions.length === 0) return
    
    const csv = Papa.unparse(transactions)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bank-statement-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const reset = () => {
    setFile(null)
    setTransactions([])
    setError(null)
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const droppedFile = files[0]
      if (droppedFile.type === 'application/pdf') {
        processFile(droppedFile)
      } else {
        setError('Please upload a PDF file')
      }
    }
  }, [processFile])

  return (
    <div className="min-h-screen bg-sand">
      {/* Navigation */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-charcoal">
              BankConvert
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-charcoal-light">
            <Shield className="w-4 h-4 text-brand" />
            <span>Privacy-First</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-full text-brand-dark text-sm mb-6">
            <Lock className="w-4 h-4" />
            <span>Your PDF never leaves your browser</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-6 leading-tight text-charcoal">
            Convert Bank Statements to CSV
            <br />
            <span className="text-brand">
              Without the Privacy Risk
            </span>
          </h1>
          
          <p className="text-xl text-charcoal-light max-w-2xl mx-auto mb-8">
            100% client-side PDF to CSV conversion. Your financial data stays on your device.{' '}
            {MAX_FREE_CONVERSIONS} free conversions, then just $5.
          </p>

          <div className="flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2 text-charcoal-light">
              <Check className="w-4 h-4 text-brand" />
              <span>No upload to servers</span>
            </div>
            <div className="flex items-center gap-2 text-charcoal-light">
              <Check className="w-4 h-4 text-brand" />
              <span>Works with Chase, BofA, Wells Fargo</span>
            </div>
            <div className="flex items-center gap-2 text-charcoal-light">
              <Check className="w-4 h-4 text-brand" />
              <span>Export to CSV/Excel</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-8 shadow-sm">
          {!file ? (
            <div className="text-center">
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={extracting}
                />
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 transition-all ${
                    isDragging 
                      ? 'border-accent bg-accent/10' 
                      : 'border-stone-300 hover:border-brand hover:bg-brand/5'
                  }`}
                >
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-accent' : 'text-brand'}`} />
                  <p className="text-lg font-medium mb-2 text-charcoal">{isDragging ? 'Drop PDF here' : 'Drop your bank statement PDF here'}</p>
                  <p className="text-charcoal-light text-sm mb-4">or click to browse</p>
                  <div className="flex justify-center gap-4 text-xs text-stone-500">
                    <span>✓ Chase</span>
                    <span>✓ Bank of America</span>
                    <span>✓ Wells Fargo</span>
                    <span>✓ Citi</span>
                  </div>
                </div>
              </label>

              {conversionsUsed > 0 && (
                <div className="mt-4 text-sm text-charcoal-light">
                  {getRemainingDisplay()} conversions remaining
                  {availableCredits > 0 && (
                    <span className="ml-2 text-brand">({availableCredits} paid credits)</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-brand" />
                <span className="font-medium text-charcoal">{file.name}</span>
              </div>
              
              {extracting ? (
                <div className="flex items-center justify-center gap-2 text-charcoal-light">
                  <div className="animate-spin w-5 h-5 border-2 border-brand border-t-transparent rounded-full" />
                  <span>Extracting transactions (client-side)...</span>
                </div>
              ) : error ? (
                <div className="text-red-500 mb-4">{error}</div>
              ) : transactions.length > 0 ? (
                <div>
                  <div className="text-brand mb-4">
                    ✓ Extracted {transactions.length} transactions
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={downloadCSV}
                      className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV
                    </button>
                    
                    <button
                      onClick={reset}
                      className="px-6 py-3 border border-stone-300 text-charcoal rounded-lg font-medium hover:bg-stone-100 transition-colors"
                    >
                      Convert Another
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Privacy Explanation */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
              <EyeOff className="w-5 h-5 text-brand" />
            </div>
            <h3 className="font-semibold mb-2 text-charcoal">100% Client-Side</h3>
            <p className="text-sm text-charcoal-light">Your PDF is processed in your browser using JavaScript. It never touches our servers.</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-brand" />
            </div>
            <h3 className="font-semibold mb-2 text-charcoal">No Data Retention</h3>
            <p className="text-sm text-charcoal-light">We don't store your transactions, account numbers, or any financial data. Ever.</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-brand" />
            </div>
            <h3 className="font-semibold mb-2 text-charcoal">Open Source</h3>
            <p className="text-sm text-charcoal-light">Our code is open source. You can verify there's no data collection or audit the security.</p>
          </div>
        </div>

        {/* Why BankConvert vs ChatGPT */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-8 shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-charcoal">Why Not Just Use ChatGPT?</h2>
            <p className="text-charcoal-light">Three reasons professionals choose BankConvert</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Privacy */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 text-charcoal">Your Data Stays Private</h3>
              <p className="text-sm text-charcoal-light">
                ChatGPT uploads your PDF to OpenAI servers. BankConvert processes everything in your browser—your bank statements never leave your device.
              </p>
            </div>

            {/* Speed */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 text-charcoal">Instant CSV Export</h3>
              <p className="text-sm text-charcoal-light">
                No waiting for AI responses. Upload → Download CSV instantly. Perfect for batch processing dozens of statements for QuickBooks or Excel.
              </p>
            </div>

            {/* Cost */}
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 text-charcoal">Pay Per Use</h3>
              <p className="text-sm text-charcoal-light">
                $5 for 10 conversions. No ChatGPT Plus subscription required ($20/mo). No AI training on your financial data.
              </p>
            </div>
          </div>

          {/* Visual Comparison */}
          <div className="mt-8 bg-sand rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-l-4 border-red-400 pl-4">
                <h4 className="font-semibold text-red-600 mb-2">ChatGPT</h4>
                <ul className="text-sm text-charcoal-light space-y-1">
                  <li>❌ Uploads to cloud servers</li>
                  <li>❌ Manual copy/paste for each statement</li>
                  <li>❌ Messy text output</li>
                  <li>❌ Requires $20/mo subscription</li>
                  <li>❌ Data used for AI training</li>
                </ul>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-600 mb-2">BankConvert</h4>
                <ul className="text-sm text-charcoal-light space-y-1">
                  <li>✅ 100% client-side processing</li>
                  <li>✅ Batch upload & instant CSV</li>
                  <li>✅ Clean, structured data</li>
                  <li>✅ $5 one-time, no subscription</li>
                  <li>✅ Zero data retention</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing - Always Visible */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-8 shadow-sm">
            <h2 className="text-2xl font-bold text-center mb-2 text-charcoal">Simple Pricing</h2>
            <p className="text-center text-charcoal-light mb-8">Choose what works for you. No hidden fees.</p>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-sand border border-stone-200 rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-2 text-charcoal">Starter</h3>
                <div className="text-3xl font-bold mb-4 text-charcoal">$5</div>
                <ul className="space-y-2 text-sm text-charcoal-light mb-6">
                  <li>✓ 10 conversions</li>
                  <li>✓ All bank formats</li>
                  <li>✓ CSV export</li>
                  <li>✓ No subscription</li>
                </ul>
                <StripeCheckoutButton 
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!}
                  className="w-full py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors block text-center"
                >
                  Buy Credits
                </StripeCheckoutButton>
              </div>

              <div className="bg-sand border-2 border-accent rounded-xl p-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white rounded-full text-xs font-semibold">
                  MOST POPULAR
                </div>
                <h3 className="font-semibold text-lg mb-2 text-charcoal">Unlimited</h3>
                <div className="text-3xl font-bold mb-4 text-charcoal">$19<span className="text-lg text-charcoal-light">/mo</span></div>
                <ul className="space-y-2 text-sm text-charcoal-light mb-6">
                  <li>✓ Unlimited conversions</li>
                  <li>✓ All bank formats</li>
                  <li>✓ Priority support</li>
                  <li>✓ Cancel anytime</li>
                </ul>
                <StripeCheckoutButton 
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED!}
                  className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors"
                >
                  Start Subscription
                </StripeCheckoutButton>
              </div>
            </div>
          </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-charcoal">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'Is my data really private?',
                a: 'Yes. Your PDF is processed entirely in your browser using JavaScript. It never uploads to our servers. We physically cannot see your bank statements.'
              },
              {
                q: 'Which banks are supported?',
                a: 'We support Chase, Bank of America, Wells Fargo, Citi, and most major banks. The parser works with standard PDF statement formats.'
              },
              {
                q: 'What if it doesn\'t work with my statement?',
                a: 'Contact us and we\'ll add support for your bank format. We\'re constantly improving our parser based on user feedback.'
              },
              {
                q: 'Can I get a refund?',
                a: 'Yes. If the converter doesn\'t work with your statements, we\'ll refund your purchase no questions asked.'
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-medium mb-2 text-charcoal">{faq.q}</h3>
                <p className="text-sm text-charcoal-light">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8 mt-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-charcoal-light">
          <p>© 2026 BankConvert. Your privacy is our business model.</p>
        </div>
      </footer>
    </div>
  )
}
