import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PredictionRequest {
  cityId: string;
  date: string;
  temperature: number;
  rainfall: number;
  humidity: number;
}

interface HistoricalData {
  case_count: number;
  temperature: number;
  rainfall: number;
  humidity: number;
  date: string;
}

// Simple ML prediction using weighted feature scoring
function predictDengueCases(
  temperature: number,
  rainfall: number,
  humidity: number,
  previousYearCases: number,
  populationDensity: number,
  month: number
): { predictedCases: number; riskLevel: string; confidence: number } {
  // Feature weights based on dengue outbreak correlations
  const weights = {
    temperature: 0.15,
    rainfall: 0.25,
    humidity: 0.20,
    previousYear: 0.25,
    density: 0.10,
    month: 0.05
  };

  // Normalize features to 0-1 scale
  const normalizedTemp = Math.min(Math.max((temperature - 20) / 20, 0), 1);
  const normalizedRainfall = Math.min(rainfall / 400, 1);
  const normalizedHumidity = Math.min(Math.max((humidity - 50) / 50, 0), 1);
  const normalizedPrevCases = Math.min(previousYearCases / 200, 1);
  const normalizedDensity = Math.min(populationDensity / 20000, 1);
  
  // Monsoon months (June-October) have higher risk
  const monsoonFactor = [6, 7, 8, 9, 10].includes(month) ? 1 : 0.3;

  // Calculate risk score
  const riskScore = (
    normalizedTemp * weights.temperature +
    normalizedRainfall * weights.rainfall +
    normalizedHumidity * weights.humidity +
    normalizedPrevCases * weights.previousYear +
    normalizedDensity * weights.density +
    monsoonFactor * weights.month
  );

  // Predict case count with some randomness
  const baseCases = Math.round(riskScore * 150);
  const variance = Math.random() * 20 - 10;
  const predictedCases = Math.max(0, Math.round(baseCases + variance));

  // Determine risk level
  let riskLevel = 'Low';
  if (predictedCases > 80) riskLevel = 'High';
  else if (predictedCases > 40) riskLevel = 'Medium';

  // Calculate confidence (higher for moderate predictions)
  const confidence = Math.max(0.65, Math.min(0.95, 1 - Math.abs(riskScore - 0.5) * 0.6));

  return {
    predictedCases,
    riskLevel,
    confidence: Math.round(confidence * 100) / 100
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cityId, date, temperature, rainfall, humidity }: PredictionRequest = await req.json();

    // Get city information
    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('id, name, population_density')
      .eq('id', cityId)
      .maybeSingle();

    if (cityError || !city) {
      throw new Error('City not found');
    }

    const requestDate = new Date(date);
    const month = requestDate.getMonth() + 1;
    
    // Get previous year's data for the same month
    const previousYear = requestDate.getFullYear() - 1;
    const previousYearDate = new Date(previousYear, requestDate.getMonth(), 1);
    const previousYearDateStr = previousYearDate.toISOString().split('T')[0];

    const { data: historicalData } = await supabase
      .from('dengue_cases')
      .select('case_count, temperature, rainfall, humidity, date')
      .eq('city_id', cityId)
      .gte('date', previousYearDateStr)
      .lte('date', `${previousYear}-12-31`)
      .order('date', { ascending: false })
      .limit(12);

    // Calculate average previous year cases
    const previousYearCases = historicalData && historicalData.length > 0
      ? Math.round(historicalData.reduce((sum: number, d: HistoricalData) => sum + d.case_count, 0) / historicalData.length)
      : 50;

    // Make prediction
    const prediction = predictDengueCases(
      temperature,
      rainfall,
      humidity,
      previousYearCases,
      city.population_density,
      month
    );

    // Store prediction in database
    const { error: insertError } = await supabase
      .from('predictions')
      .upsert({
        city_id: cityId,
        prediction_date: date,
        predicted_cases: prediction.predictedCases,
        risk_level: prediction.riskLevel,
        confidence_score: prediction.confidence,
        features: {
          temperature,
          rainfall,
          humidity,
          previousYearCases,
          populationDensity: city.population_density,
          month
        }
      }, {
        onConflict: 'city_id,prediction_date'
      });

    if (insertError) {
      console.error('Error storing prediction:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cityName: city.name,
        date,
        predictedCases: prediction.predictedCases,
        riskLevel: prediction.riskLevel,
        confidence: prediction.confidence,
        features: {
          temperature,
          rainfall,
          humidity,
          previousYearCases,
          month
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});