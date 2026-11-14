# Authentication Setup Guide — Firebase Authentication

Firebase Authentication is free on the Spark plan for email/password and Google sign-in, and needs no database from Firebase (we use MongoDB). This guide takes about 10–15 minutes.

## Part 1 — Create a Firebase account and project

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Create a project** (or **Add project**).
3. Enter a project name, e.g. `food-delivery-app`, and click **Continue**.
4. Turn **Google Analytics** off (not needed) and click **Create project**. Wait for it to finish, then click **Continue**.
5. Make sure the project is on the free **Spark** plan (shown bottom-left). Do not upgrade.

## Part 2 — Enable sign-in methods

1. In the left menu, open **Build → Authentication** and click **Get started**.
2. On the **Sign-in method** tab, click **Email/Password**, switch **Enable** on, and click **Save**. Leave "Email link (passwordless)" off.
3. (Optional, P1) Click **Add new provider → Google**, enable it, choose a **project support email**, and **Save**.
4. Open the **Settings** tab → **Authorized domains**. `localhost` is already listed. After deploying, add your production domain (e.g. `your-app.vercel.app`).

## Part 3 — Get the web app keys (client, public)

1. Click the gear icon next to **Project Overview** → **Project settings**.
2. Under **Your apps**, click the web icon **`</>`**.
3. Enter an app nickname (e.g. `web`). Leave "Firebase Hosting" unchecked. Click **Register app**.
4. Copy the `firebaseConfig` values shown. Map them as follows:

| Firebase value | Env variable                       |
| -------------- | ---------------------------------- |
| `apiKey`       | `NEXT_PUBLIC_FIREBASE_API_KEY`     |
| `authDomain`   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId`    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  |
| `appId`        | `NEXT_PUBLIC_FIREBASE_APP_ID`      |

These are not secret, but still keep them in env vars.

## Part 4 — Get the service account key (server, SECRET)

1. In **Project settings**, open the **Service accounts** tab.
2. Click **Generate new private key**, then **Generate key**. A JSON file downloads.
3. From the JSON, copy:

| JSON field     | Env variable            |
| -------------- | ----------------------- |
| `project_id`   | `FIREBASE_PROJECT_ID`   |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key`  | `FIREBASE_PRIVATE_KEY`  |

4. For `FIREBASE_PRIVATE_KEY`, keep the value in double quotes with the `\n` sequences exactly as in the file, e.g. `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`.
5. **Delete the downloaded JSON file** after copying (or store it outside the repo). Never commit it or share it publicly.

## Part 5 — Put the values in `.env.local`

Create `.env.local` in the project root (the scaffolding story creates `.env.example` for you):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`.env.local` is git-ignored by Next.js. Confirm with `git status` that it is not listed.

## Part 6 — Verify

1. Authentication → **Users** tab: it should be empty and available.
2. After the auth story is implemented, register a user in the app; it appears in this tab.

## Notes

- Sharing with the assistant: you only need to share the **four public values**. Keep the service account values to yourself and put them directly in `.env.local`.
- On Vercel, add the same variables under **Project → Settings → Environment Variables**.
- Spark plan quota is far above MVP needs. Avoid enabling phone (SMS) sign-in, which requires a paid plan.
