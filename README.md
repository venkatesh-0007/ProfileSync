# 🔄 ProfileSync

ProfileSync is a modern, responsive web dashboard built with Next.js, Tailwind CSS, and Framer Motion. It empowers users to sync, monitor, and visually verify their avatar profile pictures across multiple social networks and competitive coding platforms.

---

## ✨ Features

- 🔐 **Isolated Authentication**: A complete, client-side session manager with an in-memory/local storage database. Create an account with email & password, and save your settings independently.
- 🖼️ **Master Avatar Comparison**: Upload a central **Master Avatar** and dynamically verify whether your public profiles match this photo using a canvas-based pixel comparison engine.
- 📂 **Grouped Platform Integrations**:
  - **Social Networks**: LinkedIn, GitHub
  - **Coding Platforms**: LeetCode, CodeChef, Codeforces
- 🔍 **Smart Fallback & Rate-Limit Handling**:
  - Automatically identifies default platform avatars and private/protected silhouettes (like unavatar rate limits).
  - Flags connections as **Synced**, **Out of Sync**, **Empty Profile**, or **Unverified** with quick action links to update them directly.
  - Built-in backend proxy caching to prevent request timeouts and rate limits.
- 🎨 **Appearance Controls**: Custom theme support (toggle between Light and Dark mode) and five selectable accent colors (Blue, Violet, Emerald, Rose, Amber) that update the UI's shadows, progress tracks, and buttons in real time.
- ⚡ **Turbopack Powered**: Built using the next-generation compilation pipeline for blazing fast loads.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router & Serverless Routes)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS variables for custom themes
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for fluid state changes and hover micro-animations
- **Icons**: [Lucide React](https://lucide.dev/)
- **Image Comparison**: HTML5 Canvas-based average pixel distance hashing

---

## 🚀 Getting Started

### 📋 Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18.x or later) installed.

### 📥 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/venkatesh-0007/ProfileSync.git
   cd ProfileSync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---

## 📦 Project Structure

```text
├── public/                  # Public assets (icons, images)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── proxy-avatar/# Server route proxying platform avatars with rate-limit caches
│   │   ├── dashboard/       # Main dashboard layout, cards, & settings view
│   │   ├── signin/          # Login & Signup screen
│   │   ├── globals.css      # Core theme variables & design tokens
│   │   ├── layout.tsx       # Root layout configuration
│   │   └── page.tsx         # Landing page introducing features
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (Buttons, Cards, Badges, etc.)
│   │   └── icons.tsx        # Styled icons for platform integrations
│   ├── context/
│   │   └── UserContext.tsx  # User session & local storage state manager
│   └── lib/
│       ├── image-compare.ts # Canvas pixel delta calculations
│       └── utils.ts         # Utility class merging functions
├── tailwind.config.ts       # Tailwind theme extend configurations
└── tsconfig.json            # TypeScript configuration
```

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
