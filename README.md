<div align="center">

<!-- Animated waving banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20,24,30&height=220&section=header&text=ProfileSync&fontSize=78&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=One+Avatar.+Five+Platforms.+Perfect+Sync.&descAlignY=60&descAlign=50&descColor=aaaaff&descSize=20" width="100%" />

<!-- Typing animation -->
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&duration=2800&pause=900&color=6366F1&center=true&vCenter=true&multiline=true&repeat=true&width=650&height=70&lines=Upload+your+photo+once+%F0%9F%93%B8;Verify+sync+across+all+your+profiles+%E2%9C%85;Built+for+developers+who+care+about+their+brand+%F0%9F%9A%80" />

<br/>

<!-- Badges row -->
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-EF008F?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

[![GitHub stars](https://img.shields.io/github/stars/venkatesh-0007/ProfileSync?style=for-the-badge&color=6366f1&labelColor=1a1a2e)](https://github.com/venkatesh-0007/ProfileSync/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/venkatesh-0007/ProfileSync?style=for-the-badge&color=818cf8&labelColor=1a1a2e)](https://github.com/venkatesh-0007/ProfileSync/network)
[![License](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge&labelColor=1a1a2e)](LICENSE)

</div>

---

## 🔄 What is ProfileSync?

> **ProfileSync** is a sleek, full-stack dashboard that lets you **upload a master profile photo once** and instantly verify whether it matches your live avatar across every platform you use.

No more hunting through settings pages. No more out-of-sync profile photos. Just upload, connect, and sync.

<br/>

<div align="center">

<!-- Animated feature flow -->
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=15&duration=2000&pause=500&color=22D3EE&center=true&vCenter=true&multiline=false&repeat=true&width=500&height=40&lines=%E2%86%92+Upload+Master+Photo;%E2%86%92+Connect+Your+Platforms;%E2%86%92+Detect+Sync+Mismatches;%E2%86%92+Update+Where+Needed" />

</div>

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔐 Real Authentication
- Email + password signup/login
- Per-account isolated data storage
- Automatic session persistence

### 🖼️ Smart Avatar Comparison
- Canvas-based pixel-delta engine
- 75% similarity threshold with circular masking
- Distinguishes **Synced**, **Out of Sync**, **Empty**, and **Unverified** states

</td>
<td width="50%">

### 🎨 Full Appearance Control
- Dark / Light mode toggle
- 5 selectable accent colors (Blue, Violet, Emerald, Rose, Amber)
- Real-time CSS variable updates

### ⚡ Intelligent Fallback Handling
- Detects rate-limited SVG silhouettes from `unavatar.io`
- In-memory server-side caching (no double fetches)
- Never shows a false mismatch for private profiles

</td>
</tr>
</table>

---

## 🌐 Supported Platforms

<div align="center">

| Platform | Type | Live Avatar Fetch |
|:---:|:---:|:---:|
| ![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white) | Social Network | `unavatar.io` proxy |
| ![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white) | Social Network | `unavatar.io` proxy |
| ![LeetCode](https://img.shields.io/badge/LeetCode-FFA116?style=flat-square&logo=leetcode&logoColor=white) | Coding Platform | GraphQL API |
| ![CodeChef](https://img.shields.io/badge/CodeChef-5B4638?style=flat-square&logo=codechef&logoColor=white) | Coding Platform | HTML Scraper |
| ![Codeforces](https://img.shields.io/badge/Codeforces-1F8ACB?style=flat-square&logo=codeforces&logoColor=white) | Coding Platform | REST API |

</div>

---

## 🛠️ Tech Stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)
![Framer](https://img.shields.io/badge/Framer_Motion-EF008F?logo=framer&logoColor=white&style=for-the-badge)
![Lucide](https://img.shields.io/badge/Lucide_Icons-F56565?logo=lucide&logoColor=white&style=for-the-badge)

</div>

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/venkatesh-0007/ProfileSync.git
cd ProfileSync

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land directly on the sign-in screen.

---

## 📦 Project Structure

```
src/
├── app/
│   ├── api/proxy-avatar/     ← Server route: proxies platform avatars, rate-limit cache
│   ├── dashboard/            ← Main dashboard: overview + settings tabs
│   ├── signin/               ← Login / Signup screen
│   ├── globals.css           ← Theme tokens & accent color CSS variables
│   └── layout.tsx
├── components/
│   ├── ui/                   ← Button, Card, Badge, Progress primitives
│   └── icons.tsx             ← LinkedIn & GitHub SVG icons
├── context/
│   └── UserContext.tsx       ← Auth state, usernames, theme, avatar
└── lib/
    ├── image-compare.ts      ← Canvas pixel-delta comparison engine
    └── utils.ts
```

---

## 🔍 How the Sync Engine Works

```
User uploads Master Avatar
        │
        ▼
  Dashboard fetches /api/proxy-avatar?json=true
        │
        ├─── isEmpty: true   → "Empty Profile" card (no photo uploaded)
        ├─── isFallback: true → "Unverified" card (private/rate-limited)
        │
        └─── Valid image found
                    │
                    ▼
        Canvas pixel-delta comparison (16×16 grid, circular mask)
                    │
                    ├─── diff ≤ 25% → ✅ Synced
                    └─── diff >  25% → ⚠️ Out of Sync
```

---

## 📝 License

This project is open-source under the [MIT License](LICENSE).

<div align="center">

<!-- Animated footer wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20,24,30&height=120&section=footer&animation=fadeIn" width="100%" />

*Made with 💜 for developers who care about their brand.*

</div>
