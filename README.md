# Neislios - Collaborative Watchlist PWA

Neislios is a minimalist, modern Progressive Web App (PWA) allowing users to create, manage, and share movie watchlists collaboratively, styled similarly to Letterboxd.

Built with React, TypeScript, Vite, Supabase, Tailwind CSS, and TMDB API.

## Features

*   **Authentication:** Sign up/login via Email or Google (Supabase Auth).
*   **Friend System:** Search users, send/accept/decline friend requests, remove friends.
*   **Watchlists:**
    *   Create/Edit/Delete watchlists (title, description, color, public/private).
    *   View own, shared (editor), and favorite lists.
    *   Swipe actions (favorite/delete).
    *   Add/Remove movies.
    *   Manual drag-and-drop movie reordering.
    *   Multiple sorting options (Manual, Added Date, Title, Rating).
    *   Collaboration (Owner/Editor roles).
    *   Random movie picker within a list.
*   **Movie Discovery:**
    *   Search TMDB for movies.
    *   View movie details (poster, year, rating, runtime, genres, overview, trailer, photos).
    *   Link to IMDb page.
    *   See which friends/collaborators have watched a movie.
*   **User Profiles:**
    *   Update display name and avatar URL.
    *   View other users' profiles and their public watchlists.
*   **Real-time Updates:** Changes to lists and friendships reflect live (basic implementation).
*   **PWA:** Installable on mobile/desktop with basic offline support.
*   **Dark Mode:** Theme adapts to system preference or manual toggle.

## Tech Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
*   **API:** TMDB API for movie data
*   **UI Components:** Headless UI (implicitly via Tailwind), Heroicons
*   **Drag & Drop:** @dnd-kit
*   **Notifications:** react-hot-toast
*   **Loading States:** react-loading-skeleton
*   **Swipe Gestures:** react-swipeable

## Setup & Running Locally

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repo-name>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up Supabase:**
    *   Create a Supabase project at [supabase.com](https://supabase.com/).
    *   In your project settings, find your Project URL and `anon` key.
    *   Enable Authentication providers (Email, Google).
    *   Set up database tables (e.g., `profiles`, `watchlists`, `watchlist_movies`, `watchlist_members`, `friendships`, `friend_requests`, `user_watched_movies`, `user_favorite_watchlists`) and RLS policies according to the application logic.
    *   Enable Supabase Storage and create a public bucket named `avatars` with appropriate RLS policies (see `UserProfilePage.tsx` for policy examples if needed).
    *   Deploy the Edge Function from `supabase/functions/delete-user/index.ts` using the Supabase CLI (`supabase functions deploy delete-user --no-verify-jwt`). Make sure Docker is running. Set the required secrets (`PROJECT_URL`, `ANON_KEY`, `SERVICE_KEY`) using `supabase secrets set`.
4.  **Set up TMDB API Key:**
    *   Get an API key from [themoviedb.org](https://www.themoviedb.org/settings/api).
5.  **Create `.env` file:**
    *   Create a `.env` file in the project root.
    *   Add your environment variables:
        ```env
        VITE_SUPABASE_URL=YOUR_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        VITE_TMDB_API_KEY=YOUR_TMDB_API_KEY
        ```
6.  **Run the development server:**
    ```bash
    npm run dev
    ```
7.  Open your browser to `http://localhost:5173` (or the port specified).

## Deployment (Cloudflare Pages Example)

1.  Push your code to a GitHub repository.
2.  Connect your GitHub repository to Cloudflare Pages.
3.  Configure the build settings:
    *   **Build command:** `npm run build`
    *   **Build output directory:** `dist`
4.  Set the required environment variables in the Cloudflare Pages settings (same as in your `.env` file):
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
    *   `VITE_TMDB_API_KEY`
5.  Deploy the site.
