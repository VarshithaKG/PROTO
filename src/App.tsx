import { useState, useEffect } from 'react';
import { Activity, Calendar, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase, City, DengueCase } from './lib/supabase';
import DengueMap from './components/DengueMap';
import TrendChart from './components/TrendChart';

interface RiskData {
  riskLevel: string;
  cases: number;
}

interface TrendData {
  month: string;
  cases: number;
  riskLevel: string;
}

function App() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [riskData, setRiskData] = useState<Map<string, RiskData>>(new Map());
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [currentRisk, setCurrentRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (cities.length > 0 && selectedCityId) {
      loadData();
    }
  }, [selectedCityId, selectedDate, cities]);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (error) throw error;

      setCities(data || []);
      if (data && data.length > 0) {
        setSelectedCityId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const selectedCity = cities.find(c => c.id === selectedCityId);
      if (!selectedCity) return;

      const requestDate = new Date(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      requestDate.setHours(0, 0, 0, 0);

      const isPastDate = requestDate <= today;

      if (isPastDate) {
        await loadHistoricalData();
      } else {
        await loadPrediction();
      }

      await loadTrendData();
      await loadAllCitiesRisk();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    const { data, error } = await supabase
      .from('dengue_cases')
      .select('case_count, temperature, rainfall, humidity')
      .eq('city_id', selectedCityId)
      .eq('date', selectedDate)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const riskLevel = data.case_count > 80 ? 'High' : data.case_count > 40 ? 'Medium' : 'Low';
      setCurrentRisk({
        riskLevel,
        cases: data.case_count,
      });
    } else {
      setCurrentRisk({
        riskLevel: 'Low',
        cases: 0,
      });
    }
  };

  const loadPrediction = async () => {
    const selectedCity = cities.find(c => c.id === selectedCityId);
    if (!selectedCity) return;

    const weatherResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-weather`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
          date: selectedDate,
        }),
      }
    );

    const weatherData = await weatherResponse.json();
    if (!weatherData.success) throw new Error('Failed to fetch weather data');

    const predictionResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-dengue`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityId: selectedCityId,
          date: selectedDate,
          temperature: weatherData.temperature,
          rainfall: weatherData.rainfall,
          humidity: weatherData.humidity,
        }),
      }
    );

    const predictionData = await predictionResponse.json();
    if (!predictionData.success) throw new Error('Failed to get prediction');

    setCurrentRisk({
      riskLevel: predictionData.riskLevel,
      cases: predictionData.predictedCases,
    });
  };

  const loadTrendData = async () => {
    const endDate = new Date(selectedDate);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 11);

    const { data, error } = await supabase
      .from('dengue_cases')
      .select('date, case_count')
      .eq('city_id', selectedCityId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    if (error) throw error;

    const trends: TrendData[] = (data || []).map((d: any) => {
      const riskLevel = d.case_count > 80 ? 'High' : d.case_count > 40 ? 'Medium' : 'Low';
      const date = new Date(d.date);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cases: d.case_count,
        riskLevel,
      };
    });

    setTrendData(trends);
  };

  const loadAllCitiesRisk = async () => {
    const newRiskData = new Map<string, RiskData>();

    for (const city of cities) {
      const { data } = await supabase
        .from('dengue_cases')
        .select('case_count')
        .eq('city_id', city.id)
        .eq('date', selectedDate)
        .maybeSingle();

      if (data) {
        const riskLevel = data.case_count > 80 ? 'High' : data.case_count > 40 ? 'Medium' : 'Low';
        newRiskData.set(city.id, {
          riskLevel,
          cases: data.case_count,
        });
      } else {
        newRiskData.set(city.id, {
          riskLevel: 'Low',
          cases: 0,
        });
      }
    }

    setRiskData(newRiskData);
  };

  const selectedCity = cities.find(c => c.id === selectedCityId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Dengue Outbreak Prediction System
            </h1>
          </div>
          <p className="text-gray-600 text-lg ml-13">
            AI-powered predictions for Tier-2 Indian cities
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Select City
            </label>
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.state}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min="2021-01-01"
              max="2025-12-31"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {currentRisk && (
            <div className={`rounded-xl shadow-lg p-6 border-2 ${
              currentRisk.riskLevel === 'High' ? 'bg-red-50 border-red-300' :
              currentRisk.riskLevel === 'Medium' ? 'bg-amber-50 border-amber-300' :
              'bg-green-50 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Risk Level</span>
                <AlertCircle className={`w-5 h-5 ${
                  currentRisk.riskLevel === 'High' ? 'text-red-600' :
                  currentRisk.riskLevel === 'Medium' ? 'text-amber-600' :
                  'text-green-600'
                }`} />
              </div>
              <div className={`text-3xl font-bold mb-1 ${
                currentRisk.riskLevel === 'High' ? 'text-red-700' :
                currentRisk.riskLevel === 'Medium' ? 'text-amber-700' :
                'text-green-700'
              }`}>
                {currentRisk.riskLevel}
              </div>
              <div className="text-gray-700 text-sm">
                <span className="font-semibold">{currentRisk.cases}</span> cases
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6">
            <p className="text-blue-700 font-medium">Loading data...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Interactive Risk Map
            </h2>
            <div className="h-[500px]">
              <DengueMap
                cities={cities}
                riskData={riskData}
                selectedCityId={selectedCityId}
                onCitySelect={setSelectedCityId}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              12-Month Trend
            </h2>
            <div className="h-[500px]">
              {trendData.length > 0 && selectedCity ? (
                <TrendChart data={trendData} cityName={selectedCity.name} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No trend data available
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-600 text-sm">
          <p>Data sources: Historical dengue cases (2021-2024) | Weather simulation | ML predictions</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
