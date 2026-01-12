# Stellar Frontend

React + TypeScript frontend for Stellar application, built with Vite and Tailwind CSS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL and callback URLs:
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_AMAZON_CALLBACK_URL=http://localhost:5173/amazon-oauth-callback
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Features

- JWT Authentication (Login, Signup, Password Reset)
- User Profile Management
- Amazon Account Connection
- Channel Management
- Responsive Design with Pixis Brandbook

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Headless UI
