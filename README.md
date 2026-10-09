# Fancy Store Admin

React (Vite) admin panel with Firebase Authentication.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).

3. Enable **Authentication → Sign-in method → Email/Password**.

4. Register a Web app and copy the config values.

5. Copy env file and fill in your Firebase keys:

```bash
copy .env.example .env
```

6. Create an admin user in Firebase Console → **Authentication → Users → Add user**.

7. Start the app:

```bash
npm run dev
```

Open the local URL (usually `http://localhost:5173`) and sign in.

## Routes

| Path | Description |
|------|-------------|
| `/login` | Email/password login + forgot password |
| `/dashboard` | Home (empty placeholder) |
| `/products` | Product section (placeholder) |
| `/orders` | Order section (placeholder) |

## Admin shell

- Black sidebar: Home, Product, Order
- White top navbar with Profile menu (admin details, update password, sign out)

## Next

- Product Management CRUD
- Order Management
