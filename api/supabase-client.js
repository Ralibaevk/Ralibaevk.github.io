/**
 * Supabase Client Configuration
 * Central configuration for Supabase connection
 */

// Supabase project credentials
// TODO: Move to environment variables in production
const SUPABASE_URL = 'https://nyhomstjadhtpbjkjaim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG9tc3RqYWRodHBiamtqYWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDYyMTgsImV4cCI6MjA4NDEyMjIxOH0.7_g429QlHYkmkZLEeb8q0_kAR8ohCnqaz3vmzB9jxqg';

// Import Supabase client from CDN (for browser without bundler)
// In production, use: import { createClient } from '@supabase/supabase-js'
let supabase = null;

/**
 * Initialize Supabase client
 * Call this before using any Supabase features
 */
export async function initSupabase() {
    if (supabase) return supabase;

    // Dynamic import for CDN version
    if (typeof window !== 'undefined' && !window.supabase) {
        await loadSupabaseScript();
    }

    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase SDK not loaded');
        return null;
    }

    return supabase;
}

/**
 * Load Supabase SDK from CDN
 */
function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
        if (window.supabase) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Get the Supabase client instance
 * @returns {Object|null} Supabase client
 */
export function getSupabase() {
    return supabase;
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
    if (!supabase) await initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Get current user's profile from profiles table
 * @returns {Promise<Object|null>} Profile object or null
 */
export async function getCurrentProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with (event, session)
 * @returns {Object} Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback) {
    if (!supabase) {
        console.warn('Supabase not initialized');
        return { unsubscribe: () => { } };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
}

// Export config for reference
export const config = {
    url: SUPABASE_URL,
    // Don't export the key in production
};
