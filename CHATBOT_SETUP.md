# 🤖 GPT-Powered AI Chatbot Setup Guide

## Overview

The InfoLady website now includes a professional AI sales assistant chatbot powered by OpenAI's GPT-4 Mini model. The chatbot:

✨ **Features:**
- Real AI responses using OpenAI API (gpt-4o-mini)
- Sales-focused system prompts (lead qualification, pain-point discovery)
- Bilingual support (Russian / English)
- In-memory chat history (up to 8 messages per session)
- Auto-trigger Telegram handoff after 2 AI responses
- Professional UI with cyan gradient button and speech bubble icon
- Mobile-responsive design

🎯 **Use Cases:**
- Answer visitor questions about website audits
- Qualify leads with qualifying questions
- Explain audit value and ROI
- Direct conversation to Telegram for detailed analysis

---

## 📋 Requirements

1. **OpenAI API Key** (from https://platform.openai.com)
2. **Node.js** (v14+ for local development)
3. **Render Account** (for production deployment)

---

## 🔧 Setup Steps

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/account/api-keys
2. Click "Create new secret key"
3. Copy the key (format: `sk-proj-...`)
4. **IMPORTANT:** Save it safely - you won't see it again!

### Step 2: Configure Environment Variables

#### Local Development (`.env` file):

```bash
cd backend
cat > .env << EOF
OPENAI_API_KEY=sk-proj-your-actual-key-here
TELEGRAM_BOT_TOKEN=your_bot_token_here
NODE_ENV=development
PORT=3000
ADMIN_TOKEN=inf0lady-admin-2026
EOF
```

#### Production (Render Dashboard):

1. Go to Render Dashboard: https://dashboard.render.com
2. Find the `infolady-api` service
3. Click "Environment" 
4. Add new environment variable:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-your-actual-key-here` (paste your OpenAI key)
5. Click "Save"
6. The service will auto-redeploy

---

## 🚀 Deployment

### Architecture

The new setup has TWO services on Render:

1. **infolady-api** (Node.js backend)
   - Runs: `cd backend && npm start`
   - Port: 3000
   - API Endpoint: `https://infolady-api.onrender.com`
   - Handles: `/api/gpt-chat`, `/api/payment-intent`, etc.

2. **infolady-online** (Static frontend)
   - Runs: Serves files from `./site`
   - Connects to backend at: `https://api.infolady.online` (or local path)

### Deploy to Render

1. **First time only:** Commit and push changes:
   ```bash
   git add .
   git commit -m "Add GPT-powered AI chatbot with automatic backend deployment"
   git push origin main
   ```

2. **Render auto-deploys** - it detects the updated `render.yaml` and creates the new service

3. **Verify deployment:**
   - Check https://dashboard.render.com for `infolady-api` service
   - Confirm environment variables are set ✅
   - Check logs for: `Real SEO Analyzer running on port 3000`

### Run Locally

```bash
# Terminal 1: Backend Server
cd backend
npm install
npm start
# Should output: "Real SEO Analyzer running on port 3000"

# Terminal 2: Frontend (or use Live Server)
# The frontend automatically detects localhost and uses http://localhost:3000
# Open: http://localhost:3000 (no - open via ./site folder)
# Or: cd site && python -m http.server 8000
```

---

## 💬 How It Works

### Chatbot Flow

1. **User clicks** the cyan chat button (bottom-right)
2. **Panel opens** with greeting message
3. **User types** a message and clicks send (or presses Enter)
4. **Frontend sends** message to `/api/gpt-chat` endpoint
5. **Backend:**
   - Loads chat history for this session
   - Calls OpenAI API with system prompt
   - Returns AI response + metadata
6. **Frontend displays** response with typing delay
7. **After 2 AI responses:** Shows "Get analysis in Telegram" button

### System Prompts (Customizable)

Located in `backend/gpt.js`:

**Main Prompt (`SYSTEM_PROMPT`):**
- Used for full audit requests
- Focus: Sales, ROI, pain discovery
- Max tokens: 250
- Temperature: 0.7

**Widget Prompt (`WIDGET_SYSTEM_PROMPT`):**
- Used for chat widget
- Focus: Lead qualification, CTA to Telegram
- Max tokens: 200
- Temperature: 0.7

---

## 🛠️ Customization

### Change System Prompt

Edit `backend/gpt.js` lines 10-40:

```javascript
const SYSTEM_PROMPT = `Your custom prompt here...`;
```

### Change Model

Edit `backend/gpt.js` - change `model: 'gpt-4o-mini'` to:
- `'gpt-4'` - More intelligent, higher cost
- `'gpt-3.5-turbo'` - Faster, lower cost
- `'gpt-4-turbo'` - Best balance

### Change Chat Greeting Delay

Edit `site/js/script.js` line ~1227:
```javascript
}, 800); // Change 800 to desired milliseconds
```

### Change Button Position

Edit `site/style.css` (`.chatbot` class):
```css
.chatbot {
    position: fixed;
    bottom: 100px;  /* Change this */
    right: 24px;    /* Or this */
}
```

---

## 📊 Monitoring

### Check Backend Logs

**On Render:**
1. Go to https://dashboard.render.com
2. Click `infolady-api` service
3. Click "Logs" tab
4. Look for: `[Widget GPT] Session ... Reply:` (shows each AI response)

### Check Cost

**OpenAI Usage Dashboard:**
1. Go to https://platform.openai.com/account/billing/overview
2. Check usage this month
3. gpt-4o-mini costs ~$0.00015 per input token, ~$0.0006 per output token

**Estimate:**
- ~100 words per user message = 75 input tokens
- ~150 words per AI response = 100 output tokens
- **Per conversation:** ~$0.08 (roughly)

---

## ❌ Troubleshooting

### "🧠 Задумался. Напишите еще раз!" (Thinking... Try again!)

**Problem:** API error or OpenAI not responding

**Solutions:**
1. Check OPENAI_API_KEY is set:
   ```bash
   echo $OPENAI_API_KEY
   ```
2. Verify key is valid at https://platform.openai.com
3. Check API quota/billing at https://platform.openai.com/account/billing
4. Check backend logs for errors
5. Ensure backend service is running:
   ```bash
   curl http://localhost:3000/api/gpt-chat
   ```

### Chatbot not appearing

**Problem:** JavaScript error, api-config.js not loading

**Solutions:**
1. Check browser console (F12) for errors
2. Verify api-config.js is in `/site/js/`
3. Check HTML has `<script src="/js/api-config.js"></script>`
4. Reload page (Ctrl+Shift+R full reload)

### "Cannot POST /api/gpt-chat"

**Problem:** Backend API not found

**Solutions:**
1. Ensure backend service is deployed on Render
2. Check API_BASE_URL in browser console (F12)
3. Verify CSP header allows API domain
4. Check if backend is at different domain (update api-config.js)

### High response time

**Problem:** OpenAI API is slow

**Solutions:**
1. Check OpenAI API status: https://status.openai.com
2. Reduce max_tokens in backend/gpt.js
3. Reduce temperature (closer to 0 = faster/more deterministic)
4. Split conversation into smaller prompts

---

## 🔒 Security Notes

✅ **What's protected:**
- OpenAI API key in .env (not in code)
- CORS headers configured
- CSP headers block unauthorized requests
- Input sanitization via OpenAI prompt injection defenses

⚠️ **Best practices:**
- Never commit `.env` file (already in .gitignore)
- Rotate API key if compromised
- Use environment-specific keys for staging/prod
- Monitor API usage for unusual activity
- Rate limit chatbot if needed (can add later)

---

## 📞 Support

**Issues?**

1. Check logs: https://dashboard.render.com → `infolady-api` → Logs
2. Test API manually:
   ```bash
   curl -X POST http://localhost:3000/api/gpt-chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello","context":{"lang":"ru"}}'
   ```
3. Verify backend starts: `npm start` from backend folder

---

## 🎉 What's Next?

- ✅ AI Chatbot connected and working
- 📊 Analytics: Track chat conversations, conversion rate
- 🔄 Improvements: Better prompts, memory between sessions
- 🌍 Multi-language: Add more languages
- 🤝 CRM sync: Send qualified leads to email
- 💬 Telegram handoff: Seamless transition to bot

---

**Last Updated:** April 8, 2026  
**Status:** ✅ Ready for production
