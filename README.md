# Panimdim Flower Shop Admin

A standalone Users CRUD dashboard for `https://backend-1-po8y.onrender.com`.

The design follows the supplied Panimdim storefront reference: warm cream, forest green, serif headings, rounded panels, and a floral welcome banner. Login stays centered and uses only a username and password. No public sign-up, flower catalog, checkout, or cart is included.

## Run

Open a terminal in `C:\Users\johnk\Desktop\admin-flowershop`:

```bash
npm install
npm run dev
```

Open **http://localhost:3001**. Port 3001 keeps this app separate from your existing dashboard on port 3000.

Sign in with an existing **staff**, **admin**, or **owner** account from your friend's backend. A new account starts with the `user` role and does not automatically gain staff access. No passwords or demo accounts are built into this project.

## Backend configuration

`.env.local` contains the server-side connection setting:

```env
API_URL=https://backend-1-po8y.onrender.com
```

Change this setting and restart the frontend to use another backend. Set the same variable in your hosting platform when deploying. Never put database credentials or your friend's JWT secrets into this frontend.

## Follow each connection manually

```text
app/dashboard/page.tsx
  -> lib/users.ts                  one function for each action
    -> components/auth-provider.tsx authenticated request and session refresh
      -> lib/client.ts             browser calls /api/...
        -> app/api/users/...       Next.js server validates input
          -> lib/backend.ts        fetches API_URL with the Bearer token
            -> your friend's backend
```

| Action | Frontend helper | Live backend endpoint |
| --- | --- | --- |
| Sign in | `login()` in `components/auth-provider.tsx` | `POST /auth/login` |
| Read / Refresh | `listUsers()` in `lib/users.ts` | `GET /users` |
| Read one account | `getUser()` | `GET /users/:id` |
| Create user | `createUser()` | `POST /users` |
| Update username, password, or role | `updateUser()` | `PUT /users/:id` |
| Delete user | `deleteUser()` | `DELETE /users/:id` |
| Renew session | `auth/refresh` route | `POST /auth/refresh` |
| Confirm sign out | `logout()` | `POST /auth/logout` with `{}` |
| Start waking Render on the login page | `api/health` route | public `GET /` |

Important differences from the animal shelter admin:

- Her login and create-user requests contain **username and password only**.
- The account list contains `id`, `username`, `role`, and `created_at`. No email field exists here.
- Updating roles uses `PUT /users/:id`, not `/users/:id/role`.
- Roles shown by this app are `user`, `staff`, `admin`, and `owner`. No separate Positions API is assumed.
- Her login can return a successful HTTP response containing `{ "error": "Invalid credentials" }`. The frontend translates this to **Wrong username or password.**
- Logout requires an empty JSON body. The browser cannot choose which user to sign out.

## Where to change the interface

| File | Owns |
| --- | --- |
| `app/globals.css` | Theme colors, fonts, spacing, mobile layouts |
| `app/page.tsx` | Centered login and server-connection notice |
| `app/dashboard/page.tsx` | Welcome text, search, role filters, sort, and CRUD handlers |
| `app/dashboard/user-dialogs.tsx` | Create, Read, Update, and Delete dialogs |
| `components/user-list.tsx` | Desktop table, mobile cards, role badges, row buttons |
| `components/site-header.tsx` | Brand, greeting, light/dark switch, sign-out confirmation |
| `components/dialog.tsx` | Native dialog, Escape, focus restoration |
| `public/bloom.svg` | Floral illustration |

The light/dark switch applies to the current page session. Reloading returns to the light reference design. Search and role filters work on the loaded account list and do not change backend data.

## Session and data safety

- Access and refresh tokens stay in HttpOnly, SameSite cookies, with Secure enabled in production. Tokens do not enter localStorage or browser JavaScript.
- Next.js server routes validate form inputs and strip unknown response fields.
- The live backend remains responsible for authorization. Decoded JWT claims are display data, not a replacement for backend permission checks.
- Create first checks the current account's backend access, because the backend's `POST /users` route is otherwise public.
- A refresh request is shared between concurrent requests in the same browser session.
- Network failures never automatically retry Create, Update, or Delete. Refresh the account list first if a response is lost.
- Sign out clears this app's cookies even if the backend is unavailable. A notice distinguishes local sign-out from confirmed server revocation.
- The login page sends a public GET request to begin waking Render. This does not guarantee instant startup or keep the server permanently awake.

## Create the first admin (authorized database owner only)

Her public create-user endpoint always assigns the `user` role. An initial admin therefore needs an existing authorized staff account or direct, authorized database access. The frontend cannot invent admin privileges.

The one-time `scripts/create-admin.mjs` CLI creates a **new** account with a bcrypt-hashed password and the `admin` role. It does not reset passwords, promote existing accounts, or overwrite users. It requires a private, authenticated MySQL connection and explicit confirmation of the target database.

Use Node.js 20.12 or newer and run this in your own interactive terminal:

```bash
cd "C:\Users\johnk\Desktop\admin-flowershop"
npm run create-admin -- --env-file "C:\Users\johnk\Desktop\panimdim\Backend\.env" --ca-file ".certs\aiven-project-ca.pem"
```

Replace the environment-file path with the backend owner's existing private file. It must contain `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. The script uses the same variable names as her backend.

The separate `--ca-file` option points to the database's official CA certificate. This Aiven database uses a private project CA, so the certificate was saved locally at `.certs/aiven-project-ca.pem` (ignored by Git). Download the same certificate from the Aiven console if it is missing. You can also place the certificate in `DB_SSL_CA` with newlines escaped as `\n`. Certificate verification stays enabled, even if her backend uses a less strict setting.

Alternatively, copy `.env.admin.example` to `.env.admin`, fill it locally, and pass `--env-file ".env.admin"`. The private file is ignored by Git. Do not put database settings in `NEXT_PUBLIC_` variables, browser code, chat messages, or frontend hosting settings. This CLI is a local maintenance tool, not a web route.

The script asks for:

1. A new admin username.
2. A password of at least 12 characters and at most 72 UTF-8 bytes. Password input is hidden.
3. Password confirmation.
4. The exact confirmation phrase identifying the target database.

Only then does it connect and insert the new admin. Passwords are never printed by the script. A duplicate username causes the script to stop without changing the existing account. If a connection is lost during creation, check the users table before retrying.

### Local admin account

A one-time account named `admin` was created for this setup. Its generated password is stored in `.admin-credentials.txt` in this folder. That file is ignored by Git and its Windows permissions are restricted to the current user. Sign in at `http://localhost:3001`, open **Update** on the `admin` account, set a new password, and then delete `.admin-credentials.txt`.

The CLI itself does not create an account until someone runs it. It never overwrites an existing username or promotes an existing user. No database credentials are included in this project or requested through chat.

## Fonts

The local Geist and Cormorant Garamond font files match the supplied storefront's typography. Their SIL Open Font License files are included in `public/fonts/`. No Google Fonts connection is needed at runtime.

## Verification status

No test suite or automated browser checks are included, as requested. `npm run typecheck` and `npm run build` pass. The new local `admin` account was verified with a live `POST /auth/login` and an authenticated `GET /users` request.
