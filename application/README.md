# ⚡ Code Playground

A full-stack **Node.js** application for writing, executing, and managing JavaScript code snippets — all from the browser.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)

## Features

| Feature | Description |
|---------|-------------|
| **Code Editor** | Syntax highlighting, bracket matching, auto-close via CodeMirror |
| **Sandboxed Execution** | Runs code in Node's `vm` module — no access to `process`, `require`, or filesystem |
| **Snippet Management** | Create, edit, save, delete, search, and tag your snippets |
| **Favorites** | Star snippets for quick access |
| **Execution History** | Full log of every run (output, errors, duration) per snippet |
| **Rate Limiting** | Built-in protection against abuse (30 runs/min, 120 API calls/min) |
| **Security** | Helmet headers, input validation, parameterised SQL |
| **Keyboard Shortcuts** | `Ctrl+Enter` → Run · `Ctrl+S` → Save · `Ctrl+/` → Toggle comment |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start           # production
# or
npm run dev         # development (auto-reload with --watch)

# 3. Open in your browser
#    http://localhost:3000
```

## Project Structure

```
code-playground/
├── server.js              # Express app entry point
├── config/
│   └── db.js              # SQLite database setup & seed data
├── models/
│   └── Snippet.js         # Data-access layer (CRUD + stats)
├── services/
│   └── codeRunner.js      # Sandboxed VM code execution engine
├── routes/
│   ├── api.js             # REST API for snippets
│   └── execute.js         # POST /api/execute endpoint
├── middleware/
│   └── rateLimiter.js     # Rate-limiting middleware
├── public/                # Frontend (served as static files)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── data/                  # Auto-created SQLite database
    └── playground.db
```

## API Endpoints

| Method   | Endpoint                          | Description                 |
|----------|-----------------------------------|-----------------------------|
| `GET`    | `/api/snippets`                   | List / search snippets      |
| `GET`    | `/api/snippets/stats`             | Dashboard statistics        |
| `GET`    | `/api/snippets/:id`               | Get a single snippet        |
| `GET`    | `/api/snippets/:id/history`       | Execution history           |
| `POST`   | `/api/snippets`                   | Create a new snippet        |
| `PUT`    | `/api/snippets/:id`               | Update a snippet            |
| `PATCH`  | `/api/snippets/:id/favorite`      | Toggle favorite             |
| `DELETE` | `/api/snippets/:id`               | Delete a snippet            |
| `POST`   | `/api/execute`                    | Execute code                |
| `GET`    | `/api/health`                     | Health check                |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port |

## Deployment

The app is self-contained with an embedded SQLite database — no external services required.

```bash
# Build for production
npm install --production
PORT=8080 node server.js
```

Works on any platform with **Node.js 18+**.

## License

MIT
