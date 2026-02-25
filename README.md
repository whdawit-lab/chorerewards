# ChoreRewards — Deployment Guide

## Step 1 — Run the database schema in Supabase

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `supabase_schema.sql` from this folder
5. Copy ALL of its contents and paste into the SQL editor
6. Click **Run** (green button)
7. You should see "Success. No rows returned"

---

## Step 2 — Enable Email Auth in Supabase

1. In Supabase, go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optional: turn OFF "Confirm email" for easier testing
   - Go to Authentication → Settings
   - Toggle off "Enable email confirmations"

---

## Step 3 — Put the project on GitHub

On your computer, open Terminal (Mac) or Command Prompt (Windows):

```bash
# Install Node.js first if you don't have it: https://nodejs.org

# Navigate to this folder (adjust path as needed)
cd ~/Downloads/chorerewards

# Install dependencies
npm install

# Test it runs locally
npm start
# Opens at http://localhost:3000 — sign up and test!
# Press Ctrl+C to stop when done

# Initialize git and push to GitHub
git init
git add .
git commit -m "Initial ChoreRewards app"

# Create a new repo on github.com named "chorerewards"
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/chorerewards.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy to Vercel

1. Go to **vercel.com** and click **Add New Project**
2. Click **Import Git Repository** → select your `chorerewards` repo
3. Vercel auto-detects it's a React app — no changes needed
4. Click **Environment Variables** and add:
   - `REACT_APP_SUPABASE_URL` = `https://kykpdvrhuzhgjoysqcsq.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)
5. Click **Deploy**
6. In ~2 minutes you'll have a live URL like `chorerewards.vercel.app`

---

## Step 5 — Add your custom domain (optional, ~$12/yr)

1. Buy a domain at Namecheap or Google Domains (e.g. `chorerewards.com`)
2. In Vercel → your project → **Settings → Domains**
3. Add your domain and follow the DNS instructions

---

## Making changes later

Any time you want to update the app:
1. Describe the change to Claude
2. Claude updates the code files
3. You copy the updated files into your project folder
4. Run: `git add . && git commit -m "update" && git push`
5. Vercel auto-deploys in ~30 seconds ✅

---

## Project structure

```
chorerewards/
├── public/
│   └── index.html          ← App shell
├── src/
│   ├── lib/
│   │   ├── supabase.js     ← Database connection
│   │   ├── AuthContext.js  ← Login/signup/session
│   │   └── data.js         ← All database queries
│   ├── components/
│   │   ├── AuthPage.js     ← Login & signup screen
│   │   ├── SetupPage.js    ← First-time family setup
│   │   └── Dashboard.js    ← Main app (all tabs)
│   ├── App.js              ← App routing
│   └── index.js            ← Entry point
├── supabase_schema.sql     ← Run this in Supabase first!
├── .env                    ← Your Supabase keys
├── vercel.json             ← Vercel config
└── package.json            ← Dependencies
```
