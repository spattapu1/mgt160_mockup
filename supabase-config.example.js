// Supabase configuration
// Copy this file to supabase-config.js and replace with your actual Supabase project credentials
// Get your credentials from: https://app.supabase.com/project/_/settings/api

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
let supabaseClient = null;

// Initialize Supabase (call this after Supabase script loads)
function initSupabase() {
    // Check if credentials are configured
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('Supabase credentials not configured. Data will not be saved.');
        return false;
    }
    
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized');
        return true;
    } else {
        console.error('Supabase library not loaded');
        return false;
    }
}

// Save survey data to Supabase
async function saveSurveyData(group, demographics, roundData, finalBalance) {
    if (!supabaseClient) {
        console.warn('Supabase not initialized - data not saved (this is expected if credentials are not configured)');
        return false;
    }

    try {
        const { data, error } = await supabaseClient
            .from('survey_responses')
            .insert([
                {
                    group: group, // 'control' or 'treatment'
                    demographics: demographics,
                    round_data: roundData,
                    final_balance: finalBalance,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Error saving to Supabase:', error);
            return false;
        }

        console.log('Data saved successfully:', data);
        return true;
    } catch (err) {
        console.error('Exception saving to Supabase:', err);
        return false;
    }
}


