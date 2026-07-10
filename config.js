const CONFIG = {
    SUPABASE_URL: 'https://uerrkhupgcroosftthrh.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcnJraHVwZ2Nyb29zZnR0aHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODAwMTUsImV4cCI6MjA5OTI1NjAxNX0.eO2_zCDjlzDs-Ijj-VMqXh_SP2A9YpcDizFIXoY6DyY'
};

window.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

console.log('✅ Supabase inicializován:', window.supabase);
console.log('✅ Supabase.auth existuje?', !!window.supabase.auth);