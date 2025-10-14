/*
  # Dengue Prediction System Schema

  ## Overview
  Creates the database structure for storing dengue outbreak data and city information
  for Tier-2 Indian cities.

  ## New Tables

  ### 1. cities
  Stores information about Tier-2 Indian cities included in the prediction system.
  - `id` (uuid, primary key) - Unique identifier for each city
  - `name` (text) - City name
  - `state` (text) - State where city is located
  - `latitude` (decimal) - Geographic latitude for map display
  - `longitude` (decimal) - Geographic longitude for map display
  - `population` (integer) - City population for density calculations
  - `population_density` (integer) - Population per square kilometer
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. dengue_cases
  Stores historical dengue case data for each city.
  - `id` (uuid, primary key) - Unique identifier for each record
  - `city_id` (uuid, foreign key) - References cities table
  - `date` (date) - Date of the recorded cases
  - `case_count` (integer) - Number of dengue cases reported
  - `temperature` (decimal) - Average temperature in Celsius
  - `rainfall` (decimal) - Rainfall in millimeters
  - `humidity` (decimal) - Humidity percentage
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. predictions
  Stores ML model predictions for future dates.
  - `id` (uuid, primary key) - Unique identifier for each prediction
  - `city_id` (uuid, foreign key) - References cities table
  - `prediction_date` (date) - Date for which prediction was made
  - `predicted_cases` (integer) - Predicted number of cases
  - `risk_level` (text) - Risk classification: Low/Medium/High
  - `confidence_score` (decimal) - Model confidence (0-1)
  - `features` (jsonb) - Input features used for prediction
  - `created_at` (timestamptz) - When prediction was generated

  ## Security
  - Enable RLS on all tables
  - Allow public read access for authenticated and anonymous users (public health data)
  - Restrict write operations to authenticated users only

  ## Indexes
  - Index on city_id for faster lookups
  - Index on date fields for time-series queries
  - Composite index on city_id + date for common query patterns
*/

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  state text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  population integer NOT NULL,
  population_density integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create dengue_cases table
CREATE TABLE IF NOT EXISTS dengue_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  date date NOT NULL,
  case_count integer NOT NULL DEFAULT 0,
  temperature decimal(5, 2),
  rainfall decimal(6, 2),
  humidity decimal(5, 2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(city_id, date)
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  prediction_date date NOT NULL,
  predicted_cases integer NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  confidence_score decimal(3, 2),
  features jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(city_id, prediction_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dengue_cases_city_id ON dengue_cases(city_id);
CREATE INDEX IF NOT EXISTS idx_dengue_cases_date ON dengue_cases(date);
CREATE INDEX IF NOT EXISTS idx_dengue_cases_city_date ON dengue_cases(city_id, date);
CREATE INDEX IF NOT EXISTS idx_predictions_city_id ON predictions(city_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_predictions_city_date ON predictions(city_id, prediction_date);

-- Enable Row Level Security
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dengue_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access (public health data)
CREATE POLICY "Allow public read access to cities"
  ON cities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to dengue cases"
  ON dengue_cases FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to predictions"
  ON predictions FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies: Allow authenticated users to insert data
CREATE POLICY "Allow authenticated users to insert cities"
  ON cities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert dengue cases"
  ON dengue_cases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert Tier-2 cities data
INSERT INTO cities (name, state, latitude, longitude, population, population_density) VALUES
  ('Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, 2151466, 6666),
  ('Madurai', 'Tamil Nadu', 9.9252, 78.1198, 1561129, 3167),
  ('Mysuru', 'Karnataka', 12.2958, 76.6394, 1004197, 6611),
  ('Mangalore', 'Karnataka', 12.9141, 74.8560, 623841, 4441),
  ('Surat', 'Gujarat', 21.1702, 72.8311, 6081322, 14973),
  ('Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, 3382559, 2815),
  ('Jaipur', 'Rajasthan', 26.9124, 75.7873, 3046163, 595),
  ('Visakhapatnam', 'Andhra Pradesh', 17.6869, 83.2185, 2035922, 3000),
  ('Kochi', 'Kerala', 9.9312, 76.2673, 2117990, 7139),
  ('Bhopal', 'Madhya Pradesh', 23.2599, 77.4126, 1883381, 2579),
  ('Indore', 'Madhya Pradesh', 22.7196, 75.8577, 2195274, 27000),
  ('Vadodara', 'Gujarat', 22.3072, 73.1812, 1817191, 8000),
  ('Patna', 'Bihar', 25.5941, 85.1376, 2049156, 15567),
  ('Guwahati', 'Assam', 26.1445, 91.7362, 1116267, 4300)
ON CONFLICT (name) DO NOTHING;