-- Add helius_data column to token_metadata table to store comprehensive Helius asset data
ALTER TABLE token_metadata 
ADD COLUMN IF NOT EXISTS helius_data JSONB;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_token_metadata_helius_data 
ON token_metadata USING GIN (helius_data);

-- Comment on the column
COMMENT ON COLUMN token_metadata.helius_data IS 'Comprehensive token data from Helius getAsset API including ownership, authorities, content metadata, etc.';