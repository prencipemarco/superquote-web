-- Migration: Add goal columns to historical_matches table
-- This allows the Superquote Analyzer to calculate Over/Under and Goal/No Goal statistics

-- Add ft_home column (Full Time Home Goals)
ALTER TABLE historical_matches 
ADD COLUMN IF NOT EXISTS ft_home INTEGER;

-- Add ft_away column (Full Time Away Goals)
ALTER TABLE historical_matches 
ADD COLUMN IF NOT EXISTS ft_away INTEGER;

-- Add comment to columns for documentation
COMMENT ON COLUMN historical_matches.ft_home IS 'Full time goals scored by home team';
COMMENT ON COLUMN historical_matches.ft_away IS 'Full time goals scored by away team';
