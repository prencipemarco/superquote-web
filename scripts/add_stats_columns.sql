-- Migration: Add detailed match statistics columns
-- This enables the Analyzer to show corners, cards, and goals by half

-- Add corners columns
ALTER TABLE historical_matches 
ADD COLUMN IF NOT EXISTS home_corners INTEGER,
ADD COLUMN IF NOT EXISTS away_corners INTEGER;

-- Add cards columns
ALTER TABLE historical_matches 
ADD COLUMN IF NOT EXISTS home_yellow INTEGER,
ADD COLUMN IF NOT EXISTS away_yellow INTEGER,
ADD COLUMN IF NOT EXISTS home_red INTEGER,
ADD COLUMN IF NOT EXISTS away_red INTEGER;

-- Add half-time goals columns
ALTER TABLE historical_matches 
ADD COLUMN IF NOT EXISTS ht_home INTEGER,
ADD COLUMN IF NOT EXISTS ht_away INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN historical_matches.home_corners IS 'Corner kicks taken by home team';
COMMENT ON COLUMN historical_matches.away_corners IS 'Corner kicks taken by away team';
COMMENT ON COLUMN historical_matches.home_yellow IS 'Yellow cards received by home team';
COMMENT ON COLUMN historical_matches.away_yellow IS 'Yellow cards received by away team';
COMMENT ON COLUMN historical_matches.home_red IS 'Red cards received by home team';
COMMENT ON COLUMN historical_matches.away_red IS 'Red cards received by away team';
COMMENT ON COLUMN historical_matches.ht_home IS 'Goals scored by home team in first half';
COMMENT ON COLUMN historical_matches.ht_away IS 'Goals scored by away team in first half';
