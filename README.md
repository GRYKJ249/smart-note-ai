# Smart Note AI

Smart Note AI is a private, full-stack notes workspace built with React, TanStack Start, and MySQL.

## Local setup

```bash
cp .env.example .env
npm install
docker compose -f docker-compose.mysql.yml up -d
npm run db:generate
npm run db:migrate
npm run dev
```

The database stores users, secure sessions, and notes. Passwords are hashed with Node's `scrypt`; raw passwords and secrets never enter the database or repository.

### Authentication API

- `POST /api/auth/register` — `{ email, name, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/notes`
- `POST /api/notes` — `{ title, content }`

Set `DATABASE_URL` in `.env` for a hosted MySQL instance. In production, serve over HTTPS so the session cookie's `Secure` flag is active.
