# DreamApex Interview Assistant

AI-assisted interview practice app powered by Google Gemini.

## Features
- Role/company, JD and resume context
- Concise, detailed, STAR, technical and follow-up modes
- Gemini AI answers
- WebSocket connection
- Browser speech-to-text
- Text-to-speech
- Copy answer
- Local history
- Demo mode
- Docker support

## Gemini setup

Create a Gemini API key in Google AI Studio, then create a .env file:

    GEMINI_API_KEY=your_gemini_api_key_here
    GEMINI_MODEL=gemini-2.5-flash-lite
    PORT=3000

Install and run:

    npm install
    npm start

Open http://localhost:3000

The application uses the official @google/genai Node.js SDK. Gemini 2.5 Flash-Lite is designed for low-latency, high-frequency tasks and has a free tier according to Google's API pricing documentation.

Never commit .env or expose your API key.
