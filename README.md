# BankConvert - Privacy-First PDF to CSV Converter

Convert bank statement PDFs to CSV without uploading your data to servers. 100% client-side processing.

## Features

- ✓ **100% Client-Side Processing** - Your PDF never leaves your browser
- ✓ **Privacy-First** - No data retention, no servers storing your financial data
- ✓ **Multiple Bank Support** - Works with Chase, BofA, Wells Fargo, Citi, and more
- ✓ **Instant CSV Export** - Download clean CSV files ready for Excel/QuickBooks
- ✓ **3 Free Conversions** - Try before you buy
- ✓ **Simple Pricing** - $5 for 10 conversions or $19/month unlimited

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf-lib (client-side)
- **CSV Generation**: Papa Parse
- **Payments**: Stripe
- **Deployment**: Vercel

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/bank-convert.git
cd bank-convert
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in your Stripe keys:
- `STRIPE_SECRET_KEY` - From Stripe Dashboard
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard
- `NEXT_PUBLIC_STRIPE_PRICE_STARTER` - Create a product in Stripe
- `NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED` - Create a subscription in Stripe

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

## How It Works

1. **Upload** - User selects a PDF bank statement
2. **Extract** - JavaScript extracts text from PDF client-side using pdf-lib
3. **Parse** - Regex patterns identify dates, descriptions, and amounts
4. **Export** - CSV is generated and downloaded directly in the browser

Your PDF file never uploads to any server. All processing happens in your browser.

## Privacy Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Upload │────▶│ Browser JS   │────▶│ CSV Export  │
│   (PDF)     │     │ (pdf-lib)    │     │  (download) │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ NO SERVERS   │
                     │ NO UPLOADS   │
                     │ NO RETENTION │
                     └──────────────┘
```

## Supported Banks

- Chase
- Bank of America
- Wells Fargo
- Citi
- US Bank
- Capital One
- And more (generic PDF parsing)

## Monetization

### Free Tier
- 3 conversions
- All features included
- No credit card required

### Paid Options

**Starter - $5**
- 10 conversions
- One-time payment
- Perfect for occasional use

**Unlimited - $19/month**
- Unlimited conversions
- Cancel anytime
- Best for bookkeepers and accountants

## Marketing Strategy

### Launch Plan

1. **Reddit Launch**
   - r/Bookkeeping
   - r/Accounting
   - r/QuickBooks
   - r/sidehustle

2. **Twitter/X**
   - @JerryTheAI account
   - #buildinpublic thread
   - Privacy-focused messaging

3. **Indie Hackers**
   - Show IH post
   - Revenue transparency

### Key Messaging

- "Your bank statements contain your entire financial life. Other tools upload them to cloud servers. We don't."
- "Convert PDF bank statements to CSV without uploading your data"
- "100% client-side processing = 100% privacy"

## Future Enhancements

- [ ] AI-powered parsing (optional, with consent)
- [ ] Support for more bank formats
- [ ] Batch processing (multiple PDFs at once)
- [ ] API for developers
- [ ] Open source the client-side parser

## License

MIT - Feel free to fork and modify.

## Support

For issues or feature requests, please open a GitHub issue or contact support@bankconvert.io

---

Built with privacy in mind. Your data is yours.
# bank-converter-to-csv
# bank-converter-to-csv
