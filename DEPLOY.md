# Deploying the web version on Render (free)

The phone app runs through Expo. This puts the **web version** online.

1. Go to <https://dashboard.render.com>, click **New**, then **Blueprint**, and connect the GitHub repo `dm7675/dietbuddy`.
2. Render reads [`render.yaml`](render.yaml) and creates a free **static site** called `dietbuddy`:
   - **Build:** `npm ci && npx expo export --platform web` (Node 24)
   - **Publish folder:** `dist`
   - All paths are rewritten to `index.html`, so links like `/plan` work.
3. Render asks for two environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   Paste them from Supabase (see [RECEIPTS-SETUP.md](RECEIPTS-SETUP.md)). Leave them empty if you haven't set up Supabase yet: the app works, but receipt scanning and recipes stay off.
4. Click **Apply**. The first build takes a few minutes. Every push to `main` redeploys automatically.

**If you add or change the variables later:** in Render, open **Environment**, save the change, then use **Manual Deploy → Clear build cache & deploy**. The values are built into the page, so a rebuild is needed.

**Where data is saved:** each browser keeps its own data (profile, plans, logs) in local storage. Nothing personal is saved on Render.
