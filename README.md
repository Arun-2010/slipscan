# 🧾 SlipScan

### Scan bills. Track every rupee. Stay within your budget.

SlipScan is a smart expense-tracking mobile app that helps you manage your daily spending by scanning bills, automatically extracting expense details using AI, and tracking your monthly budget.

Built with **Expo, React Native, Supabase, and AI-powered bill scanning.**

<p align="center">
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 AI Bill Scanning | Scan bills and automatically extract expense details. |
| 💰 Expense Tracking | Keep track of every rupee you spend. |
| 🎯 Monthly Budget | Set a monthly spending limit and monitor usage. |
| 📊 Spending Overview | Understand your spending through a simple dashboard. |
| 📜 Transaction History | View and manage your previous expenses. |
| ✏️ Manual Entry | Add or edit expenses manually. |
| 📤 CSV Export | Export your expense records. |
| 🔔 Notifications | Stay informed about your budget. |

## 📱 App Screens

<!-- Add your app screenshots here -->

<p align="center">
  <i>Welcome • Home • Scan • History • Settings</i>
</p>

<!--
<p align="center">
  <img src="screenshots/home.png" width="180" />
  <img src="screenshots/scan.png" width="180" />
  <img src="screenshots/history.png" width="180" />
</p>
-->

## 🛠️ Tech Stack

**Mobile Application**
- React Native
- Expo
- Expo Router
- TypeScript
- React Query

**Backend & Database**
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)
- Supabase Edge Functions

**AI Integration**
- Google Gemini
- Anthropic Claude
- AI-powered receipt and bill extraction

## 🏗️ Project Structure

```text
SlipScan/
│
├── app/                     # Expo Router screens
│   ├── (tabs)/              # Home, History, Scan, Add, Settings
│   ├── welcome.tsx
│   ├── set-limit.tsx
│   ├── scan.tsx
│   ├── review.tsx
│   └── bill/
│
├── src/
│   ├── api/                 # Supabase API & React Query hooks
│   ├── lib/                 # Utility functions & business logic
│   └── components/          # Reusable UI components
│
├── supabase/
│   ├── migrations/          # Database migrations
│   └── functions/
│       └── scan-bill/       # AI bill scanning function
│
├── .env.example
├── claude.md
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Expo Go (Android/iOS)
- Supabase account
- Gemini API key and/or Anthropic API key

### 1. Clone the repository

```bash
git clone https://github.com/Arun-2010/SlipScan.git
cd SlipScan
```

### 2. Configure Supabase

Create a project at [Supabase](https://supabase.com).

Enable anonymous sign-ins:

`Dashboard → Authentication → Sign In / Providers`

Enable the anonymous sign-in option.

### 3. Configure Supabase CLI

```bash
npx supabase login

npx supabase link --project-ref <your-project-ref>

npx supabase db push
```

### 4. Configure AI API keys

```bash
npx supabase secrets set GEMINI_API_KEY=<your-api-key>
```

Or configure Claude:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=<your-api-key>
```

Deploy the Edge Function:

```bash
npx supabase functions deploy scan-bill
```

### 5. Configure environment variables

Create your `.env` file:

```bash
cp .env.example .env
```

Add your Supabase project URL and anonymous key:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 6. Install dependencies and run

```bash
npm install

npx expo start
```

Scan the QR code using Expo Go to run the application.

## 🔍 Code Quality Checks

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Run Expo lint:

```bash
npx expo lint
```

## 🔐 Security

- AI API keys are stored securely in Supabase Edge Function secrets.
- AI API keys are never exposed in the mobile application.
- Supabase Row Level Security protects database access.
- Database changes are managed through migrations.

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request.

---

<p align="center">
  <b>Made with ❤️ to make expense tracking simpler.</b>
  <br/>
  <i>SlipScan — Every rupee counts.</i>
</p>
