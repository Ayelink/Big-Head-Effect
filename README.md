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

## Local Development

```bash
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate into the project folder
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

## Environment Variables

To run this project locally with full functionality, you need to configure the following environment variables in your Supabase Edge Functions:

- `STRIPE_SECRET_KEY`: Your Stripe secret key for processing payments.
- `AI_API_TOKEN`: Token for accessing the Enter AI API.

## Deployment

This project is designed to be deployed via Enter.pro. Simply click "Publish" in your Enter workspace to deploy the frontend and Edge Functions automatically.