// Initialize Supabase Client
const supabaseUrl = 'https://kagimdnkyqfduhcbkceo.supabase.co';
const supabaseKey = 'sb_publishable_CK_brkHkAuXEmMkEV1-3TA_YcEoWSSZ';
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("🔥 Supabase has been successfully connected to your site! 🔥");
