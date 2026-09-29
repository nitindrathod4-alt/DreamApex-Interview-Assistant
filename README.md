# DreamApex Interview Assistant

Complete local AI-assisted interview practice application.

Features: interview setup, JD/resume context, concise/detailed/STAR/technical/follow-up modes, AI generation, WebSocket, speech-to-text, text-to-speech, copy, local history, health API, demo mode and Docker.

## Run

```bash
git clone https://github.com/nitindrathod4-alt/DreamApex-Interview-Assistant.git
cd DreamApex-Interview-Assistant
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000.

Windows PowerShell: `Copy-Item .env.example .env` then `npm install` and `npm start`.

Add OPENAI_API_KEY to .env. Without a key, demo mode works.

## Docker

```bash
docker compose up --build
```

Use this only in interviews where AI assistance is explicitly permitted. The project does not implement stealth, screen-share evasion, credential theft, or hidden monitoring.
