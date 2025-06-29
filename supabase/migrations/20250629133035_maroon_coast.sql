/*
  # Create interviews table

  1. New Tables
    - `interviews`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `created_at` (timestamptz, defaults to now())
      - `job_details` (jsonb, stores job-related information)
      - `transcript` (jsonb, stores interview transcript data)
      - `report_data` (jsonb, stores generated report information)
      - `overall_score` (int2, stores interview score)

  2. Security
    - Enable RLS on `interviews` table
    - Add policy for users to SELECT their own records
    - Add policy for users to INSERT their own records

  3. Foreign Key Constraints
    - `user_id` references `auth.users(id)` with CASCADE delete
*/

-- Create the interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  job_details jsonb DEFAULT '{}',
  transcript jsonb DEFAULT '{}',
  report_data jsonb DEFAULT '{}',
  overall_score int2
);

-- Enable Row Level Security
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Create policy for users to select their own records
CREATE POLICY "Users can read own interviews"
  ON interviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own records
CREATE POLICY "Users can insert own interviews"
  ON interviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS interviews_user_id_idx ON interviews(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS interviews_created_at_idx ON interviews(created_at DESC);