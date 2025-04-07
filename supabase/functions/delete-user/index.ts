// supabase/functions/delete-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Delete User function booting up')

serve(async (req) => {
  // 1. Check if the request is authorized (user is logged in)
  let userIdToDelete = null;
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header');

    // Create a temporary Supabase client using the user's login token
    const supabaseClient = createClient(
      Deno.env.get('PROJECT_URL') ?? '', // Use different env var name
      Deno.env.get('ANON_KEY') ?? '',    // Use different env var name
      { global: { headers: { Authorization: authHeader } } }
    )
    // Get the user ID from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) throw new Error('Invalid user token');
    userIdToDelete = user.id; // This is the ID of the user asking for deletion

  } catch (error) {
    console.error('Auth check failed:', error.message);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  // 2. Perform the deletion using special admin privileges
  try {
    // Create a special Supabase client with admin rights (using a secret key)
    const supabaseAdmin = createClient(
      Deno.env.get('PROJECT_URL') ?? '',   // Use different env var name
      Deno.env.get('SERVICE_KEY') ?? '' // Use different env var name
    )

    // Tell Supabase's admin system to delete the user
    console.log(`Attempting to delete user: ${userIdToDelete}`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) throw deleteError; // If error, stop and report it

    console.log(`Successfully deleted user: ${userIdToDelete}`);

    // Return a success message
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})