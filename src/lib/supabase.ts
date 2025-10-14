import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface City {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  population_density: number;
}

export interface DengueCase {
  id: string;
  city_id: string;
  date: string;
  case_count: number;
  temperature: number;
  rainfall: number;
  humidity: number;
}

export interface Prediction {
  id: string;
  city_id: string;
  prediction_date: string;
  predicted_cases: number;
  risk_level: 'Low' | 'Medium' | 'High';
  confidence_score: number;
  features: Record<string, any>;
}
