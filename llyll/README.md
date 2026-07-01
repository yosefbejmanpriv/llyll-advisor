# llyll advisor

AI-powered tool that helps llyll users figure out what video to make, what to say, and who to invite.

## Deploy to Vercel (5 minutes)

1. **Push to GitHub**
   - Create a new repo on github.com
   - Upload these files (drag & drop the folder works)

2. **Deploy on Vercel**
   - Go to vercel.com → New Project
   - Import your GitHub repo
   - Before clicking Deploy, go to **Environment Variables** and add:
     ```
     ANTHROPIC_API_KEY = sk-ant-your-key-here
     ```
   - Click Deploy

3. **Done** — Vercel gives you a live URL like `llyll-advisor.vercel.app`

## Run locally

```bash
npm install
cp .env.local.example .env.local
# Add your key to .env.local
npm run dev
# Open http://localhost:3000
```
