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

## Architecture Notes

This project relies on **Enter Cloud (Supabase Edge Functions)** and **Enter AI API** for its core functionality (AI image generation and Stripe payments). The frontend communicates securely with these serverless functions to handle sensitive operations like payment session creation and AI model invocation.