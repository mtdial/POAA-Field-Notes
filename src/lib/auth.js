import { supabase } from './supabase';

export async function signIn(username, password) {
  // Look up the real email for this username via a Postgres function
  // that is callable by unauthenticated (anon) users.
  const { data: email, error: lookupError } = await supabase
    .rpc('get_email_for_username', { p_username: username.trim().toLowerCase() });

  if (lookupError || !email) {
    throw new Error('Unknown username');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Touch last_active_at on the user's profile row.
export async function touchLastActive(userId) {
  await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
}
