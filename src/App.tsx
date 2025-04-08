import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { useAuth } from './hooks/useAuth'; // Updated import path
import MainLayout from './components/layout/MainLayout'; // Import MainLayout
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import SettingsPage from './pages/SettingsPage';
import WatchlistDetailPage from './pages/WatchlistDetailPage';
import MovieSearchPage from './pages/MovieSearchPage';
import ManageItemsPage from './pages/ManageItemsPage'; // Import the renamed page
import ManageCollaboratorsPage from './pages/ManageCollaboratorsPage';
import MediaDetailsPage from './pages/MovieDetailsPage'; // Import the renamed component
import UserProfilePage from './pages/UserProfilePage'; // Import User Profile Page

// Simple Protected Route Component
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Optional: Show a loading indicator while checking auth state
    return <div className="flex justify-center items-center min-h-screen">Checking authentication...</div>;
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in, render the nested routes via Outlet within the MainLayout
  return <MainLayout><Outlet /></MainLayout>;
};


function App() {
  const { loading: authLoading } = useAuth(); // Use a different name to avoid conflict

  // Show a global loading indicator while the initial auth state is determined
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading Application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Routes using MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/watchlist/:id" element={<WatchlistDetailPage />} /> {/* Add route for watchlist detail */}
        <Route path="/search" element={<MovieSearchPage />} /> {/* Add route for movie search */}
        <Route path="/watchlist/:id/manage" element={<ManageItemsPage />} /> {/* Use the renamed page */}
        <Route path="/watchlist/:id/collaborators" element={<ManageCollaboratorsPage />} /> {/* Add route for managing collaborators */}
        <Route path="/movie/:tmdbId" element={<MediaDetailsPage />} /> {/* Render MediaDetailsPage */}
        <Route path="/tv/:tmdbId" element={<MediaDetailsPage />} /> {/* Add route for TV details */}
        <Route path="/user/:userId" element={<UserProfilePage />} /> {/* Add route for user profiles */}
        {/* Add other protected routes here */}
      </Route>

      {/* Handle 404 or redirect for unmatched routes if needed */}
      <Route path="*" element={<Navigate to="/" replace />} /> {/* Basic fallback */}

    </Routes>
  );
}

export default App;
