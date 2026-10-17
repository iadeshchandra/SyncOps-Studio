# SyncOps Studio — Deploy Guide (owner hand-steps)

Everything below is done in the browser (Firebase console + GitHub web UI).
No terminal, no code, no card required — the Spark plan (free tier) covers
Hosting, Firestore, and Authentication.

## One-time setup

### 1. Create the Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**.
2. Name it `syncops-studio`. Disable Google Analytics when asked (keeps it simple).
3. Wait for provisioning to finish, then open the project.

### 2. Enable Authentication
1. In the left nav: **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable **Email/Password** → Save.
3. Enable **Google** → pick a support email → Save.

### 3. Create the Firestore database
1. **Build → Firestore Database → Create database**.
2. Choose **production mode** and the region closest to your clients.
3. The security rules ship from this repo (`firestore.rules`) on every deploy.

### 4. Register the web app and copy the config
1. **Project Overview → Add app → Web** (the `</>` icon). Nickname: `syncops-studio-web`.
2. Copy the six values from the `firebaseConfig` block shown:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

### 5. Generate the deploy service-account key
1. **Project settings (gear icon) → Service accounts**.
2. Click **Generate new private key** → download the JSON file.
   This file is the `FIREBASE_SERVICE_ACCOUNT` secret. **Never share it or paste it anywhere except the GitHub Secrets page below.**

### 6. Add GitHub Secrets
1. Open the repo: `https://github.com/iadeshchandra/SyncOps-Studio` → **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** for each of these (name → value):
   - `FIREBASE_SERVICE_ACCOUNT` → the entire JSON from step 5
   - `FIREBASE_PROJECT_ID` → the `projectId` from step 4
   - `VITE_FIREBASE_API_KEY` → `apiKey`
   - `VITE_FIREBASE_AUTH_DOMAIN` → `authDomain`
   - `VITE_FIREBASE_PROJECT_ID` → `projectId`
   - `VITE_FIREBASE_STORAGE_BUCKET` → `storageBucket`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` → `messagingSenderId`
   - `VITE_FIREBASE_APP_ID` → `appId`
   - `VITE_OWNER_EMAILS` → your owner email address (this unlocks the Studio Console)

### 7. Install the deploy workflow (GitHub web UI)
Automation is blocked from writing `.github/workflows/`, so this one file is
added by hand — once:
1. In the repo, click **Add file → Create new file**.
2. Name it exactly `.github/workflows/firebase-deploy.yml`.
3. Paste the full content of `.github/workflows/firebase-deploy.yml` from this
   workspace (same filename), then **Commit changes** directly to `main`.

### 8. Bootstrap the owner allowlist (fail-closed by design)
The security rules deny owner operations until this document exists:
1. Firebase console → **Build → Firestore Database → Start collection**.
2. Collection ID: `platformConfig` → **Next**.
3. Document ID: `admins` → add field `owners`, type **array**, value: your owner email → **Save**.
4. The `platformConfig/public` document is created automatically the first time
   you publish settings from the Studio Console.

### 9. Deploy
- Push any change to `main`, **or** open the repo's **Actions** tab → **Build and deploy to Firebase** → **Run workflow**.
- Watch the run go green. Your site is live at `https://<project-id>.web.app`
  (custom domain optional, free, under Hosting in the Firebase console).

## Day-to-day
- **Content changes** (pricing, case studies, hero stats, maintenance mode): open
  `/studio/console` while signed in as the owner — no deploys needed.
- **Deploys** happen automatically on every push to `main`.
- The app keeps working in **demo mode** locally with zero Firebase config.
