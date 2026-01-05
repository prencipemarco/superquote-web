
import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carica variabili d'ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Errore: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY mancanti nel file .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const results = [];
const BATCH_SIZE = 500; // Supabase ha limiti sulle insert, meglio fare batch piccoli

console.log("Inizio lettura CSV...");

fs.createReadStream('src/dataset/Matches.csv')
    .pipe(csv())
    .on('data', (data) => {
        // Filtra righe vuote o non valide se necessario
        if (data.MatchDate && data.HomeTeam) {
            results.push({
                match_date: data.MatchDate,
                home_team: data.HomeTeam,
                away_team: data.AwayTeam,
                home_elo: parseFloat(data.HomeElo) || null,
                away_elo: parseFloat(data.AwayElo) || null,
                odd_home: parseFloat(data.OddHome) || null,
                odd_draw: parseFloat(data.OddDraw) || null,
                odd_away: parseFloat(data.OddAway) || null,
                ft_result: data.FTResult,
                ft_home: parseFloat(data.FTHome) || null,
                ft_away: parseFloat(data.FTAway) || null,
                division: data.Division
            });
        }
    })
    .on('end', async () => {
        console.log(`CSV letto. Totale righe: ${results.length}`);
        console.log("Inizio upload su Supabase...");

        let insertedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batch = results.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('historical_matches')
                .insert(batch);

            if (error) {
                console.error(`Errore nel batch ${i / BATCH_SIZE + 1}:`, error);
                errorCount += batch.length;
            } else {
                insertedCount += batch.length;
                if (insertedCount % 5000 === 0) {
                    console.log(`Inseriti ${insertedCount} record...`);
                }
            }
        }

        console.log("--------------------------------");
        console.log("Upload Completato!");
        console.log(`Record inseriti con successo: ${insertedCount}`);
        console.log(`Record falliti: ${errorCount}`);
    });
