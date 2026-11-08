# AI setup: receipt scanning & recipes (free, about 10 minutes)

Receipt scanning and "Make it a recipe" need two free accounts:

- **Google AI Studio** gives you a Gemini API key. Gemini is the AI that reads the photo.
- **Supabase** runs one small server function, `dietbuddy-ai`, that holds that key. It also hosts the shared price database.

The rest of the app works without them.

> **Stay free:** never turn on billing in Google AI Studio or Google Cloud for this key. Without billing, heavy use only hits the free daily limit and costs nothing. Supabase's free plan doesn't need a card either.

---

## 1. Get a Gemini API key

1. Go to <https://aistudio.google.com/apikey> and sign in with a Google account.
2. Click **Create API key**, then copy the key (starts with `AIza…`).
3. Keep it private. It goes into Supabase in step 4, **not** into the app.

## 2. Create a Supabase project

1. Go to <https://supabase.com>, sign up, and click **New project**.
2. Fill in the project:
   - **Name:** `dietbuddy`
   - **Database password:** anything strong; you won't need it in the app.
   - **Region:** *Central EU (Frankfurt)*, the closest to Croatia.
3. Wait about a minute for the project to start.

## 3. Create the price table

1. In your project, open **SQL Editor**, then **New query**.
2. Paste everything from [`supabase/migrations/0001_receipt_prices.sql`](supabase/migrations/0001_receipt_prices.sql) and click **Run**.
3. You should see "Success. No rows returned".

## 4. Add the AI function

**Option A: in the browser (easiest)**

1. Open **Edge Functions** and click **Deploy a new function**, then **Via Editor**.
2. Name it exactly `dietbuddy-ai`.
3. Replace the example code with everything from [`supabase/functions/dietbuddy-ai/index.ts`](supabase/functions/dietbuddy-ai/index.ts), then click **Deploy**.
4. Open the function's **Settings** (or **Details**), turn **off** "Verify JWT" / "Enforce JWT verification", and save.
5. Go to **Edge Functions**, then **Secrets**, then **Add new secret**:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your key from step 1
   - Optionally add `GEMINI_MODEL` (for example `gemini-3.8-flash`). If you leave it out, the newest Flash model is picked automatically.

**Option B: command line**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-ID
npx supabase functions deploy dietbuddy-ai --no-verify-jwt
npx supabase secrets set GEMINI_API_KEY=AIza...
```

## 5. Connect the app

1. In Supabase, open **Project Settings**, then **API** (or **API Keys**), and copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **anon** / **publishable** key. This key is meant to be public. **Never** use the `service_role` / secret key.
2. In the project folder, copy `.env.example` to **`.env.local`** and fill in both values.
3. Restart the app with a clean cache: `npx expo start -c`

The **Scan** tab now shows **Take photo** and **Choose photo** instead of "not set up", and every meal's **Recipe** screen gets a **Make it a recipe** button.

On **Render** (or any web host), add the same two values as environment variables instead of using `.env.local`. See [DEPLOY.md](DEPLOY.md).

---

## What gets shared

When you save a receipt, each matched food is sent to the shared database. A row looks like this:

```
store: lidl · city: Split · food: chicken_breast · price per kg: 7.19 · receipt date: 2026-11-07
```

Nothing else is sent: no name, no account, no device id. Your Supabase function doesn't keep the photo. It only passes the photo to Gemini to be read. Note that on Gemini's **free tier, Google may use what you send to improve its products** (see the Gemini API terms). A shop receipt normally only shows products, prices, the store and the date. Avoid photographing receipts that show a loyalty-card name or card details.

Other users in your city get the **median** price once at least two receipts agree. Your own receipt prices are always used first on your phone.

## Troubleshooting

| Message on the Scan tab | Fix |
|---|---|
| `GEMINI_API_KEY secret is not set` | Step 4.5: the secret name must match exactly. |
| `HTTP 401` | "Verify JWT" is still on (step 4.4), or `.env.local` has the wrong key. |
| `HTTP 404` | The function isn't named exactly `dietbuddy-ai`. |
| `Gemini 429 …` | Free daily limit reached. Try again tomorrow. |
| `Sharing failed` | The SQL in step 3 wasn't run (the table is missing). |
