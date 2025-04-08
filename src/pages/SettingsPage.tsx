import { useState, useEffect } from 'react'; // Removed unused state/effect for dark mode
// Removed unused Link import
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useHeader } from '../hooks/useHeader';
import { useTheme } from '../hooks/useTheme'; // Import useTheme hook
function SettingsPage() {
  const { signOut, user } = useAuth();
  const { setHeaderTitle } = useHeader();
  const { isDarkMode, toggleDarkMode } = useTheme(); // Use theme context
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Remove useState for passwordError and passwordSuccess
  // const [passwordError, setPasswordError] = useState<string | null>(null);
  // const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // --- Dark Mode Logic removed (now handled by ThemeProvider) ---

  // Set Header Title
  useEffect(() => {
    setHeaderTitle('Settings');
  }, [setHeaderTitle]);

  // toggleDarkMode function now comes from useTheme hook

  // --- Logout Handler ---
  const handleLogout = async () => {
    const toastId = toast.loading('Logging out...'); // Show loading toast
    try {
      await signOut();
      toast.success('Logged out successfully!', { id: toastId }); // Update toast on success
      // Navigation handled by ProtectedRoute
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error((error as Error).message || 'Logout failed.', { id: toastId }); // Update toast on error
    }
  };

  // --- Change Password Handler ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear previous toasts if any
    // toast.dismiss(); // Optional: dismiss all previous toasts

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to change your password.");
      return;
    }

    setPasswordLoading(true);
    const toastId = toast.loading('Updating password...');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;

      toast.success("Password updated successfully!", { id: toastId });
      setNewPassword('');
      setConfirmPassword('');

    } catch (err: unknown) { // Use unknown
      console.error("Error updating password:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to update password.', { id: toastId }); // Check error type
    } finally {
      setPasswordLoading(false);
    }
  };

  // --- Delete Account Handler ---
  const handleDeleteAccount = async () => {
      if (window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and will remove all your data.")) {
          // Removed second confirmation
          setPasswordLoading(true);
          const toastId = toast.loading('Deleting account...');
          try {
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (sessionError || !session) {
                  throw new Error("Could not get user session to authorize deletion.");
              }

              const { error: functionError } = await supabase.functions.invoke('delete-user', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${session.access_token}` }
              });

              if (functionError) throw functionError;

              toast.success("Account deleted successfully. Logging out...", { id: toastId, duration: 4000 });
              await signOut(); // Logout happens after toast is shown

          } catch (err: unknown) { // Use unknown
               console.error("Error deleting account:", err);
               toast.error(err instanceof Error ? err.message : 'Failed to delete account.', { id: toastId }); // Check error type
               setPasswordLoading(false); // Ensure loading stops on error
          }
          // No finally block needed here as logout navigates away
      }
  };

  // --- Render ---
  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Removed redundant h2 title */}

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="text-lg font-semibold mb-3 border-b pb-2 dark:border-gray-700 dark:text-gray-100">Appearance</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isDarkMode ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}/>
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="text-lg font-semibold mb-3 border-b pb-2 dark:border-gray-700 dark:text-gray-100">Account</h3>
          <div className="space-y-4">
            {/* Removed Edit Display Name link */}

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3 pt-4 border-t dark:border-gray-600">
              <h4 className="font-medium dark:text-gray-100">Change Password</h4>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <input id="newPassword" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <input id="confirmPassword" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
              </div>
              {/* Removed static error/success messages */}
              <button type="submit" disabled={passwordLoading || !newPassword || newPassword !== confirmPassword} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            {/* Delete Account Button */}
            <div className="pt-4 border-t dark:border-gray-600">
              <button
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50" // Changed styling
                onClick={handleDeleteAccount}
                disabled={passwordLoading}
              >
                Delete Account {/* Removed comment */}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="text-center mt-6">
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded shadow">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;