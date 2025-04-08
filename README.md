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
