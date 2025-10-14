const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WeatherRequest {
  latitude: number;
  longitude: number;
  date?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { latitude, longitude, date }: WeatherRequest = await req.json();
    
    // For this demo, we'll generate realistic weather data
    // In production, integrate with OpenWeatherMap API
    const requestDate = date ? new Date(date) : new Date();
    const month = requestDate.getMonth() + 1;
    const today = new Date();
    const isPastDate = requestDate < today;

    // Simulate realistic weather patterns based on month
    let temperature: number;
    let rainfall: number;
    let humidity: number;

    if ([6, 7, 8, 9].includes(month)) {
      // Monsoon months
      temperature = 25 + Math.random() * 8;
      rainfall = 100 + Math.random() * 300;
      humidity = 70 + Math.random() * 20;
    } else if ([12, 1, 2].includes(month)) {
      // Winter months
      temperature = 18 + Math.random() * 10;
      rainfall = Math.random() * 30;
      humidity = 50 + Math.random() * 30;
    } else if ([3, 4, 5].includes(month)) {
      // Summer months
      temperature = 28 + Math.random() * 15;
      rainfall = Math.random() * 50;
      humidity = 40 + Math.random() * 30;
    } else {
      // Post-monsoon
      temperature = 22 + Math.random() * 12;
      rainfall = Math.random() * 100;
      humidity = 55 + Math.random() * 30;
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: requestDate.toISOString().split('T')[0],
        temperature: Math.round(temperature * 100) / 100,
        rainfall: Math.round(rainfall * 100) / 100,
        humidity: Math.round(humidity * 100) / 100,
        source: 'simulated'
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