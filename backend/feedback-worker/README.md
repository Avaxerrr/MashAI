# MashAI Feedback Worker

This Cloudflare Worker handles secure feedback submission for the MashAI desktop app. It proxies requests to Discord and Web3Forms, keeping API keys secure and out of the client-side code.

## Setup & Deployment

### 1. Prerequisites
- **Node.js** and **npm** installed.
- **Wrangler CLI** installed (`npm install -g wrangler`).
- **Cloudflare Account** (Free tier works).

### 2. Login
```bash
wrangler login
```

### 3. Deploy
```bash
cd backend/feedback-worker
wrangler deploy
```
This will give you a Worker URL (e.g., `https://mashai-feedback.username.workers.dev`).

### 4. Configure Secrets (Important!)
You must upload your API keys to Cloudflare. These are **not** stored in the code.

Run the following commands in your terminal (one by one) and paste your keys when prompted:

```bash
# Web3Forms Access Key (for email feedback)
wrangler secret put WEB3FORMS_ACCESS_KEY

# Discord Webhooks (for anonymous feedback)
# You can use the same URL for all if you want, or different ones for categorization.
wrangler secret put DISCORD_WEBHOOK_BUG
wrangler secret put DISCORD_WEBHOOK_SUGGESTION
wrangler secret put DISCORD_WEBHOOK_QUESTION
wrangler secret put DISCORD_WEBHOOK_GENERAL
```

## Rotating Secrets (Security)
If your keys are ever compromised (e.g., accidentally committed to GitHub), follow these steps to rotate them:

1.  **Generate New Keys**:
    -   **Discord**: Go to Server Settings -> Integrations -> Webhooks. Delete old webhooks and create new ones. Copy the new URLs.
    -   **Web3Forms**: Go to [web3forms.com](https://web3forms.com) and generate a new Access Key.

2.  **Update Cloudflare**:
    Simply run the `secret put` commands again with the new values. This overwrites the old keys instantly.

    ```bash
    wrangler secret put WEB3FORMS_ACCESS_KEY
    # Paste NEW key...
    ```

    **Alternative: Cloudflare Dashboard (Easier)**
    If the terminal commands are difficult, you can use the browser:
    1.  Go to [dash.cloudflare.com](https://dash.cloudflare.com).
    2.  Navigate to **Workers & Pages** -> **mashai-feedback** -> **Settings** -> **Variables and Secrets**.
    3.  Click **Edit** (pencil icon) to overwrite any secret with the new value.

3.  **Verify**: Test the feedback form in the app to ensure it works.

## API Usage
The worker accepts `POST` requests with the following JSON body:
```json
{
  "type": "bug",
  "message": "Something is broken",
  "email": "user@example.com", // Optional, triggers Web3Forms
  "version": "1.0.0",
  "os": "Windows"
}
```
