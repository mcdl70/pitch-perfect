/*
  # Update overall_score column type to support decimal values

  1. Changes
    - Change `overall_score` column from `smallint` to `numeric(3,1)` to support decimal scores like 4.5
    - This allows scores from 0.0 to 10.0 with one decimal place precision

  2. Data Safety
    - Uses safe column type conversion that preserves existing integer values
    - Existing integer scores will be automatically converted to decimal format (e.g., 4 becomes 4.0)
*/

-- Change the overall_score column type from smallint to numeric to support decimal values
ALTER TABLE interviews 
ALTER COLUMN overall_score TYPE numeric(3,1);

-- Add a comment to document the column's purpose and range
COMMENT ON COLUMN interviews.overall_score IS 'Overall interview score from 0.0 to 10.0';