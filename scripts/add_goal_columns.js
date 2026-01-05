require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Errore: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devono essere definiti nel file .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGoalColumns() {
    console.log('🔧 Aggiunta colonne ft_home e ft_away alla tabella historical_matches...\n');

    try {
        // Nota: Con la chiave ANON non possiamo eseguire ALTER TABLE direttamente
        // Dobbiamo usare il SQL Editor di Supabase o la Service Role Key
        console.log('⚠️  IMPORTANTE: Devi eseguire questo SQL manualmente nel Supabase SQL Editor:\n');
        console.log('-----------------------------------------------------------');
        console.log('ALTER TABLE historical_matches ADD COLUMN IF NOT EXISTS ft_home INTEGER;');
        console.log('ALTER TABLE historical_matches ADD COLUMN IF NOT EXISTS ft_away INTEGER;');
        console.log('-----------------------------------------------------------\n');
        console.log('📍 Vai su: https://supabase.com/dashboard/project/YOUR_PROJECT/sql\n');
        console.log('Dopo aver eseguito il SQL, ri-esegui: node scripts/ingest_matches.js');

    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
    }
}

addGoalColumns();
