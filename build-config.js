// Build script to generate supabase-config.js from environment variables
// This is used during Render deployment
// Run with: node build-config.js

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Validate environment variables
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set!');
    console.error('Please configure these in your Render dashboard under Environment Variables.');
    process.exit(1);
}

const configContent = `// Supabase configuration
// This file is auto-generated during build
// Do not edit manually - use environment variables in Render

// Make variables globally accessible for admin dashboard
var SUPABASE_URL = '${SUPABASE_URL}';
var SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

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
`;

const outputPath = path.join(__dirname, 'supabase-config.js');
try {
    fs.writeFileSync(outputPath, configContent, 'utf8');
    console.log('✓ Generated supabase-config.js from environment variables');
    console.log('✓ File written to:', outputPath);
    
    // Verify file was created
    if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log('✓ File verified - size:', stats.size, 'bytes');
    } else {
        console.error('ERROR: File was not created!');
        process.exit(1);
    }
} catch (err) {
    console.error('ERROR: Failed to write supabase-config.js:', err.message);
    process.exit(1);
}


