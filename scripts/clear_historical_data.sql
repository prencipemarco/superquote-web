-- Clear all existing data from historical_matches table
-- This ensures we start fresh with the complete 2025 dataset

DELETE FROM historical_matches;

-- Verify table is empty
SELECT COUNT(*) FROM historical_matches;
-- Should return 0

-- After running this, execute: node scripts/ingest_matches.js
