# CirKit Deployment Spec

## Architecture
- **Frontend**: Vercel (React/Vite)
- **Backend**: Render free tier (Python/FastAPI)
- **Database**: Supabase (already hosted)

## Frontend — Vercel

### Setup
1. Go to [vercel.com](https://vercel.com), sign in with GitHub
2. Import the `kiroHacks` repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Environment Variables (Vercel dashboard → Settings → Environment Variables)
```
VITE_SUPABASE_URL=https://rhbxvgolfllgagrsedzz.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
```

### SPA Routing
Create `frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### API Proxy
The frontend calls `http://localhost:8000` in dev. For production, update fetch URLs to point to the deployed backend URL, or add a rewrite in `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://your-backend.onrender.com/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Backend — Render

### Setup
1. Go to [render.com](https://render.com), sign in with GitHub
2. New → Web Service → connect `kiroHacks` repo
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3.12
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Environment Variables (Render dashboard)
```
ANTHROPIC_API_KEY=<your_key>
```

### CORS
Update `backend/main.py` to allow the Vercel domain:
```python
allow_origins=["http://localhost:5173", "https://your-app.vercel.app"]
```

## Pre-deploy Checklist
- [ ] Replace hardcoded `http://localhost:8000` in RunPanel.jsx with env var or `/api/` proxy
- [ ] Update CORS origins in backend/main.py
- [ ] Add `frontend/vercel.json` with rewrites
- [ ] Set all env vars in Vercel and Render dashboards
- [ ] Run SQL migration in Supabase if not done
- [ ] Test: landing page → app → chat → generate code → animation

## DNS (optional)
Point a custom domain in Vercel dashboard → Settings → Domains.
