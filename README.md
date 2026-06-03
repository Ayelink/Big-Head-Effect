# Big Head Avatar Generator

A mobile-first web application that applies a "Big Head Small Body" caricature effect to uploaded photos using Generative AI.

## Features

- **AI-Powered Caricature**: Uses `google/gemini-3.1-flash-image-preview` to intelligently enlarge the subject's head while maintaining the original image ratio.
- **Adjustable Scale**: Interactive slider to adjust the head enlargement ratio from 1.0x to 4.0x.
- **Mobile-First Design**: Responsive UI optimized for mobile devices with a minimalist "Spécialiste Belge" aesthetic.
- **History Tracking**: Automatically saves generated images in a vertical history list for easy comparison.
- **State Persistence**: Uses `sessionStorage` to maintain user state and history across page reloads.
- **Monetization Ready**: Integrated with Stripe Checkout for paid downloads, supporting Credit Cards, Alipay, and WeChat Pay.
- **Anti-Scraping**: Built-in protections against right-click saving, long-press saving, and image dragging.
- **Analytics**: Instrumented with Enter Analytics SDK to track user engagement and conversion metrics.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Edge Functions (Deno)
- **AI Integration**: Enter AI API (img_2_img)
- **Payments**: Stripe Checkout
- **Analytics**: Enter Analytics SDK

## How to Run & Deploy

This project relies on **Enter Cloud (Supabase Edge Functions)** and **Enter AI API** for its core functionality (AI image generation and Stripe payments). Therefore, it cannot be run purely locally just by installing npm dependencies.

### The Recommended Way: Enter.pro

The easiest and only fully supported way to run, edit, and deploy this project is through the Enter.pro platform:

1. Open this project in your Enter workspace.
2. The platform automatically provisions the necessary Edge Functions, AI API tokens, and database connections.
3. Click **"Publish"** in the top right corner to deploy the frontend and backend simultaneously.

### Local Development (Frontend Only)

If you wish to run the frontend locally for UI adjustments:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

*Note: When running locally, AI generation and Stripe payment features will fail unless you manually configure a local Supabase instance, deploy the Edge Functions, and provide valid `STRIPE_SECRET_KEY` and `AI_API_TOKEN` environment variables.*