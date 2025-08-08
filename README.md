# Neislios - Collaborative Movie Watchlist PWA

live test here;
neislios.pages.dev

> **exploration into PWAs, React, and collaborative experiences.**

Hi there, I'm Deniz, and this is **Neislios** - a minimalist, modern Progressive Web App which lets you create, manage, and share movie/serie watchlists with friends. Think Letterboxd meets collaborative planning, built with modern web technologies.

My girlfriend and I were unable find an app or site like this and I absolutely love tinkering with code and building projects that solve real problems and that's the story of how this app came about.

I should add a huge disclamer here that this project is mainly for my personal use and I'm kind of new to this programming thing. While I did the high level desing of the Neislios, most of the grunt work and actual code have been written/edited by several different AIs. That being said I love learning so I am open to any and all kinds of feedback!

##  What Makes This Special

 **Smart Authentication** - Seamless login via email or Google using Supabase Auth  
 **Friend Networks** - Connect with friends, send requests, and discover what they're watching  
 **Collaborative Lists** - Create watchlists together with owner/editor permissions  
 **Intuitive Management** - Drag-and-drop reordering, multiple sorting options, swipe actions  
 **Decision Helper** - Can't decide what to watch? Use the random movie picker!  
 **Rich Movie Data** - Powered by TMDB API with trailers, photos, ratings, and IMDb links  
 **Personal Profiles** - Customize your space and browse others' public lists  
 **Real-time Magic** - See updates instantly as friends add movies or make changes  
 **True PWA** - Install on any device with offline support  
 **Adaptive Design** - Beautiful dark mode that follows your system preferences

##  Built With Modern Tools

**Frontend Excellence:**
- **React 19** with TypeScript - Latest React features with full type safety
- **Vite** for lightning-fast builds and Hot Module Replacement
- **Tailwind CSS** with PostCSS for responsive, utility-first styling
- **Heroicons** for consistent, beautiful iconography

**Backend & Database:**
- **Supabase** - Complete backend-as-a-service solution
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions for live collaboration
  - Authentication with email/password and Google OAuth
  - Edge Functions for serverless computing
- **TMDB API** - Comprehensive movie and TV show data

**Interactive Features:**
- **@dnd-kit** - Modern drag-and-drop with touch support
- **react-swipeable** - Gesture recognition for mobile interactions
- **react-hot-toast** - Elegant notification system
- **react-loading-skeleton** - Smooth loading states

**Progressive Web App:**
- **Vite PWA Plugin** with Workbox for service worker management
- **Manifest configuration** for installable app experience
- **Offline caching** with smart cache strategies
- **Background sync** for seamless updates

##  Technical Architecture Deep Dive

### **State Management Strategy**
I've implemented a clean, scalable state management approach using React Context API with custom hooks:

- **Context Providers**: `AuthContext`, `ThemeContext`, `HeaderContext`, `LayoutActionContext`
- **Custom Hooks**: Encapsulated business logic in reusable hooks
  - `useAuth()` - Authentication state and methods
  - `useWatchlistDetails()` - Watchlist data fetching with caching
  - `useWatchlistItems()` - Items management with TMDB integration
  - `useWatchlistMembers()` - Collaborative features and permissions
  - `useAIRecommendations()` - Intelligent movie suggestions
  - `useWatchlistAI()` - AI eligibility checking and management

### **Database Architecture**
Supabase PostgreSQL with carefully designed relationships:

```sql
-- Core Tables
- profiles (user data)
- watchlists (list metadata)  
- watchlist_members (collaboration & permissions)
- watchlist_items (movie/TV entries with ordering)
- user_watched_items (viewing history)
- friendships (social connections)
- friend_requests (pending connections)
- user_favorite_watchlists (bookmarked lists)
```

**Row Level Security (RLS)**: Every table has fine-grained security policies ensuring users can only access their own data and shared content they have permission to view.

### **Real-time Collaboration**
Real-time features powered by Supabase's PostgreSQL Change Data Capture:

- **Live Updates**: Changes to watchlists, items, and memberships sync instantly
- **Optimistic UI**: Immediate feedback with rollback on errors
- **Event Broadcasting**: Custom events for cross-component state synchronization
- **Conflict Resolution**: Smart handling of concurrent edits

### **AI Recommendation Engine**
Built a sophisticated recommendation system combining multiple data sources:

**Algorithm Components:**
- **Genre Analysis**: Frequency-based preference mapping
- **Keyword Extraction**: TMDB keyword API for content similarity
- **Collaborative Filtering**: Using TMDB's recommendation API as base data
- **Scoring System**: Weighted algorithm combining:
  - Genre compatibility (40%)
  - Keyword similarity (45%) 
  - Popularity normalization (15%)
- **Smart Selection**: Balanced mix of top matches with randomization for discovery

**Performance Optimizations:**
- **Eligibility Checking**: Only activate for lists with 10+ items
- **API Rate Limiting**: Intelligent batching and caching of TMDB requests
- **Async Processing**: Non-blocking recommendation generation
- **State Persistence**: Session storage for recommendation continuity

### **Progressive Web App Implementation**
Comprehensive PWA setup for native app experience:

**Service Worker Strategy:**
```javascript
// Workbox configuration with smart caching
- Static assets: Cache First (fonts, icons, CSS)
- API responses: Network First with fallback
- Images: Stale While Revalidate
- Offline support: Essential pages cached
```

**Manifest Features:**
- **Installation prompts** across all platforms
- **Custom splash screens** with brand colors
- **Adaptive icons** for Android
- **iOS optimization** with apple-touch-icon support

### **Performance Engineering**
Optimized for speed and user experience:

**Code Splitting:**
- Route-based lazy loading with React Suspense
- Vendor chunk separation (React, Supabase, UI libraries)
- Dynamic imports for heavy components

**Caching Strategy:**
- **Session Storage**: Search states, scroll positions, modal states
- **Local Storage**: User preferences, theme settings
- **Browser Cache**: Static assets with long-term caching
- **Memory Cache**: TMDB responses and user data

**Bundle Optimization:**
- Tree shaking for minimal bundle size
- Optimized chunk splitting (vendor: 150KB, main: ~200KB)
- Compression and minification in production

### **Type Safety & Developer Experience**
Full TypeScript implementation with robust type definitions:

**Custom Type System:**
```typescript
// Comprehensive interfaces for all data structures
interface WatchlistItemWithDetails extends WatchlistItem {
  tmdbDetails?: TmdbMediaDetails;
}

// Generic utility types for API responses
type UseHookReturn<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};
```

**Error Boundaries**: Graceful error handling with fallback UIs and detailed error logging

### **Mobile-First Design**
Touch-optimized interface with gesture support:

- **Drag & Drop**: 1-second hold activation for mobile-friendly interaction
- **Swipe Actions**: Native-feeling swipe to favorite/delete on cards
- **Responsive Grid**: CSS Grid with intelligent breakpoints
- **Touch Targets**: 44px minimum for accessibility compliance

## 🌱 My Learning Journey

This project represents my exploration into:
- **Progressive Web Apps** - Understanding offline capabilities and native-like experiences
- **Modern React Patterns** - Context, custom hooks, and component composition
- **TypeScript** - Building type-safe applications that scale
- **Real-time Features** - Implementing collaborative experiences with Supabase
- **UI/UX Design** - Creating intuitive, beautiful interfaces with Tailwind CSS

## Future Plans

I mostly consider this project done, as it accomplishes everything I've outlined in the original desing document. So currently, no active work is being done on this.

## 📬 Connect With Me

I'd love to hear your thoughts, suggestions, or just chat about code and creativity!

📧 **Email:** [b.denizkoca@gmail.com](mailto:b.denizkoca@gmail.com)  
🐙 **GitHub:** [@BDenizKoca](https://github.com/BDenizKoca)  
📍 **Location:** İstanbul, Turkey

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ You can use this code for personal or commercial projects
- ✅ You can modify and distribute it
- ✅ You just need to include the license notice
- ✅ No warranty provided (use at your own risk!)

Feel free to learn from the code, build upon it, or use it as inspiration for your own projects!
