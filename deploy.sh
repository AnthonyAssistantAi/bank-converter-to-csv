#!/bin/bash

# Deploy BankConvert to Vercel
# Usage: ./deploy.sh

echo "🚀 Deploying BankConvert to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for environment variables
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Creating from .env.example..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local with your Stripe keys before deploying!"
    exit 1
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add your Stripe keys to Vercel environment variables"
echo "2. Test the payment flow"
echo "3. Launch on Reddit!"
