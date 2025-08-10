# Neislios

**Live demo:** [neislios.pages.dev](https://neislios.pages.dev)  

Neislios is a minimalist, modern Progressive Web App to create, manage, and share movie/series watchlists with friends – think Letterboxd meets collaborative planning.

---

## Features  

<p align="center">
  <img src="public/demo.gif" alt="Neislios app demo" width="220">
</p>



- Smart authentication with email or Google (Supabase Auth)  
- Collaborative watchlists with owner/editor permissions  
- Drag-and-drop reordering and swipe gestures  
- Rich TMDB-powered movie/series data with trailers and ratings  
- AI recommendations once a list has 10+ items  
- Real-time updates for a shared, live experience  
- Offline-ready, installable PWA with dark mode  

---

## Why I Built It  
My girlfriend and I were unable find an app or site like this and I absolutely love tinkering with code and building projects that solve real problems and that's the story of how this app came about.

---

## Live Demo / Install  

- **Live version:** [neislios.pages.dev](https://neislios.pages.dev)  
- **Install locally:**  
  1. Clone the repo  
     ```bash
     git clone https://github.com/BDenizKoca/neislios
     ```  
  2. Install dependencies  
     ```bash
     npm install
     ```  
  3. Run  
     ```bash
     npm run dev
     ```  

---

## Usage  
1. Sign in with email or Google (Supabase Auth - sign up is mail only).  
2. Create a watchlist and invite friends.  
3. Add movies/series from TMDB.  
4. Reorder, sort, or use the random picker to decide what to watch.  
5. Once you add 10+ movies/series to any list, explore new movies/series through the AI Recommendation feature.

---

## Tech Stack

**Core**
- React 19 + TypeScript, Vite
- Tailwind CSS, Heroicons

**State & Data**
- React Context + custom hooks
- Supabase (PostgreSQL + RLS, Auth, Realtime, Edge Functions)
- TMDB API

**Interaction & UX**
- @dnd-kit (drag and drop), react-swipeable (gestures)
- react-hot-toast, react-loading-skeleton

**PWA**
- Vite PWA plugin (Workbox)
- Offline caching, installable manifest, background sync

**Infra**
- Cloudflare Pages (CI from GitHub), edge caching

<details>
<summary><strong>Deeper look</strong></summary>

- Routing and code-splitting with React lazy/Suspense  
- Optimistic UI for realtime updates  
- Caching layers: session/local storage for UI state, in-memory for TMDB responses  
- Type safety: strict TS, shared interfaces for Supabase rows and TMDB types  
- Error boundaries and fallback UIs  
- RLS policies to restrict reads/writes by user and membership  
</details>


---

## Future Plans

I mostly consider this project done, as it accomplishes everything I've outlined in the original desing document. So feature-complete but open to contributions.

---

## Connect With Me  
Email: [b.denizkoca@gmail.com](mailto:b.denizkoca@gmail.com)  
GitHub: [@BDenizKoca](https://github.com/BDenizKoca)  

---

## License  
MIT License – You can use, modify, and distribute freely with attribution.  
