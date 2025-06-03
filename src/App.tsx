import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { useAuth } from './hooks/useAuth';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load page components for better code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WatchlistDetailPage = lazy(() => import('./pages/WatchlistDetailPage'));
const MovieSearchPage = lazy(() => import('./pages/MovieSearchPage'));
const ManageItemsPage = lazy(() => import('./pages/ManageItemsPage'));
const ManageCollaboratorsPage = lazy(() => import('./pages/ManageCollaboratorsPage'));
const MediaDetailsPage = lazy(() => import('./pages/MovieDetailsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const GoogleOnboardingPage = lazy(() => import('./pages/GoogleOnboardingPage'));

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
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
          <Route path="/google-onboarding" element={<GoogleOnboardingPage />} />

          {/* Protected Routes using MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/watchlist/:id" element={<WatchlistDetailPage />} />
            <Route path="/search" element={<MovieSearchPage />} />
            <Route path="/watchlist/:id/manage" element={<ManageItemsPage />} />
            <Route path="/watchlist/:id/collaborators" element={<ManageCollaboratorsPage />} />
            <Route path="/movie/:tmdbId" element={<MediaDetailsPage />} />
            <Route path="/tv/:tmdbId" element={<MediaDetailsPage />} />
            <Route path="/user/:userId" element={<UserProfilePage />} />
          </Route>

          {/* Handle 404 or redirect for unmatched routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
