# DreamApex Interview Assistant

A local AI-assisted interview tool for authorized interview sessions.

## Features
- Real-time WebSocket connection
- AI answer generation
- Concise / detailed / STAR / technical modes
- Browser speech-to-text dictation
- Copy answer
- Session history
- Local Node.js deployment
- Docker support

## Local setup

```bash
git clone https://github.com/nitindrathod4-alt/DreamApex-Interview-Assistant.git
cd DreamApex-Interview-Assistant
npm install
copy .env.example .env
npm start
```

Open **http://localhost:3000**.

On Linux/macOS use `cp .env.example .env` instead of `copy`.

Add your LLM API key to `.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Without an API key, the application runs in demo mode.

## Docker

```bash
docker compose up --build
```

Then open http://localhost:3000.

## Project structure

```
DreamApex-Interview-Assistant/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── server.js
```

Use this only when AI assistance is permitted by the interview organizer.
