import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { City } from '../lib/supabase';

interface DengueMapProps {
  cities: City[];
  riskData: Map<string, { riskLevel: string; cases: number }>;
  selectedCityId: string | null;
  onCitySelect: (cityId: string) => void;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'High':
      return '#ef4444';
    case 'Medium':
      return '#f59e0b';
    case 'Low':
      return '#10b981';
    default:
      return '#6b7280';
  }
};

export default function DengueMap({ cities, riskData, selectedCityId, onCitySelect }: DengueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    cities.forEach(city => {
      const risk = riskData.get(city.id);
      const riskLevel = risk?.riskLevel || 'Low';
      const cases = risk?.cases || 0;
      const color = getRiskColor(riskLevel);
      const isSelected = city.id === selectedCityId;

      const marker = L.circleMarker([city.latitude, city.longitude], {
        radius: isSelected ? 12 : 8,
        fillColor: color,
        color: '#fff',
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <strong style="font-size: 14px;">${city.name}</strong><br/>
          <span style="color: ${color}; font-weight: 600;">${riskLevel} Risk</span><br/>
          <span style="font-size: 13px;">Cases: ${cases}</span><br/>
          <span style="font-size: 12px; color: #6b7280;">${city.state}</span>
        </div>
      `);

      marker.on('click', () => {
        onCitySelect(city.id);
      });

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [cities, riskData, selectedCityId, onCitySelect]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h3 className="text-sm font-semibold mb-2">Risk Level</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-xs">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-xs">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}
