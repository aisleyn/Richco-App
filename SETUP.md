# Richco Construction App — Setup Guide

## Prerequisites
Install Node.js from: https://nodejs.org (download the LTS version)

## First-Time Setup
Open a terminal in this folder and run:

```
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## On iPhone (add to home screen)
1. Run `npm run dev` on your computer
2. Find your computer's local IP address (Settings > Network, or run `ipconfig`)
3. On iPhone, open Safari and go to: http://YOUR_IP:5173
4. Tap Share > Add to Home Screen
5. The app runs like a native app

## Environment Variables (optional real integrations)
Copy `.env.example` to `.env` and fill in your keys:
- `VITE_OPENWEATHER_KEY` — OpenWeatherMap free key for live weather
- `VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID` — Microsoft login
- `VITE_AZURE_OPENAI_*` — Azure OpenAI for real AI chat

Without any keys, the app runs fully with mock data.

## Build for Production
```
npm run build
```
Output goes to the `dist/` folder — deploy to Azure Static Web Apps, Vercel, or any web host.
