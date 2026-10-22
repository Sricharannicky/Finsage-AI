<div align="center">

# 💰 FinSage AI

### AI-Powered Personal Finance Management Platform

Manage your finances smarter with AI-driven insights, expense tracking, budgeting, and intelligent financial recommendations.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)


</div>

---

# 📖 Overview

FinSage AI is a modern AI-powered personal finance platform designed to help users manage their financial life through intelligent insights, budgeting tools, expense tracking, and interactive analytics.

The application combines a scalable full-stack architecture with AI to provide users with personalized financial guidance through an intuitive and responsive interface.

---

# ✨ Features

- 🤖 AI Financial Assistant
- 💸 Expense Tracking
- 📊 Budget Planning
- 📈 Financial Analytics Dashboard
- 🔐 Secure User Authentication
- 👤 User Profile Management
- 📱 Fully Responsive Design
- ⚡ Fast & Modern UI
- 📂 Organized Financial Records
- 📉 Spending Analysis
- 🎯 Goal-based Budget Planning

---

# 🏗️ System Architecture

```
                User
                  │
                  ▼
      Next.js Frontend (React)
                  │
                  ▼
          API Routes (Backend)
          ┌─────────┴─────────┐
          ▼                   ▼
     Prisma ORM          AI Services
          │
          ▼
      Database
```

---

# 🛠️ Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons

## Backend

- Next.js API Routes
- Prisma ORM
- NextAuth

## Database

- Prisma

## State Management

- Zustand
- TanStack Query

## Form Handling

- React Hook Form
- Zod

## AI

- AI SDK
- AI-powered Financial Insights

---

# 📂 Project Structure

```
FinSage-AI
│
├── app/
├── components/
├── hooks/
├── lib/
├── prisma/
├── public/
├── styles/
├── types/
├── utils/
├── middleware.ts
├── package.json
└── README.md
```

---

# 🚀 Application Flow

```
User

↓

Login / Register

↓

Dashboard

↓

Expense Management

↓

Budget Planning

↓

AI Financial Analysis

↓

Insights & Recommendations

↓

Better Financial Decisions
```

---

# 🎯 Key Highlights

- Modern Full-Stack Architecture
- AI-assisted Financial Recommendations
- Secure Authentication
- Responsive UI
- Type-safe Development using TypeScript
- Scalable Database Integration
- Clean Component-Based Architecture

---

# 📸 Screenshots

> Add screenshots of:

- Login Page
- Dashboard
- AI Assistant
- Budget Planner
- Expense Tracker
- Analytics Page

---

# 🔮 Future Improvements

- Voice-enabled AI Assistant
- Investment Portfolio Tracking
- Bank Account Integration
- Bill Reminder System
- Mobile Application
- Multi-language Support
- Financial Goal Prediction
- Personalized Investment Suggestions

---

# 💡 What I Learned

Through this project I gained practical exposure to:

- Building modern full-stack applications
- AI-assisted software development workflows
- Component-based architecture
- Authentication systems
- Database integration
- State management
- Form validation
- Modern UI development
- Deployment and project organization

---

# ⚙️ Installation

```bash
# 1. Clone repository
git clone https://github.com/Sricharannicky/Finsage-AI.git
cd Finsage-AI

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# (Optional) Add your free Groq API key in .env from https://console.groq.com for AI insights

# 4. Initialize local SQLite database
npm run db:push

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Click **Continue with Google** to sign in with Google.
- Click **Try Demo with Sample Data** for an instant interactive experience with pre-seeded transactions!

---

# 🔑 Google Sign-In Configuration

FinSage AI supports official Google OAuth 2.0:

1. Create a Web OAuth 2.0 Client ID at [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add your Authorized JavaScript origin: `http://localhost:3000`
3. Add to your `.env` file:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   ```
*(When running locally without a Google Client ID, clicking "Continue with Google" opens the interactive local Google test sign-in).*

---

# 🌐 Live Demo

**Live Application**

> https:https://r13k25r237q1-deploy.space-z.ai

---

# 👨‍💻 Author

**Sricharan S Y**

Software Engineer

- Java Developer
- SAP ABAP Developer
- AI Application Developer
- Cloud Enthusiast

GitHub:
https://github.com/Sricharannicky

LinkedIn:
(https://www.linkedin.com/in/sricharan-s-y-7557172a0/)

Protfolio:
(https://candid-caramel-15d66d.netlify.app)

---



---

## ⭐ Support

If you found this project helpful, consider giving it a ⭐ on GitHub.

It motivates me to continue building and improving open-source projects.
