-- Update what_ifs table constraints
-- Make prompt optional and title non-nullable

-- Remove the existing prompt constraint
ALTER TABLE what_ifs DROP CONSTRAINT IF EXISTS what_ifs_prompt_not_empty;

-- Make prompt nullable
ALTER TABLE what_ifs ALTER COLUMN prompt DROP NOT NULL;

-- Make title non-nullable (set default for existing null values first)
UPDATE what_ifs SET title = 'Untitled What-If Scenario' WHERE title IS NULL;
ALTER TABLE what_ifs ALTER COLUMN title SET NOT NULL;

-- Add constraint for title to ensure it's not empty when provided
ALTER TABLE what_ifs ADD CONSTRAINT what_ifs_title_not_empty CHECK (LENGTH(TRIM(title)) > 0);
