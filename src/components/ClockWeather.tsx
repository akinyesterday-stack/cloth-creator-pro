import { useState, useEffect, forwardRef } from "react";
import { Clock, Cloud, CloudRain, Sun, CloudSun, MapPin, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'partly-cloudy' | 'rainy';
  humidity: number;
}

const DISTRICTS = [
  "Bağcılar",
  "Şirinevler",
  "Bakırköy",
  "Beylikdüzü",
  "Esenyurt",
  "Küçükçekmece",
  "Bahçelievler",
  "Güngören",
];

// Simulated weather data (in real app, would use API)
const getSimulatedWeather = (district: string): WeatherData => {
  const conditions: WeatherData['condition'][] = ['sunny', 'cloudy', 'partly-cloudy', 'rainy'];
  const hash = district.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const conditionIndex = (hash + new Date().getHours()) % conditions.length;
  
  return {
    temp: 15 + (hash % 10),
    condition: conditions[conditionIndex],
    humidity: 40 + (hash % 40),
  };
};

const WeatherIcon = ({ condition }: { condition: WeatherData['condition'] }) => {
  switch (condition) {
    case 'sunny':
      return <Sun className="h-5 w-5 text-warning" />;
    case 'cloudy':
      return <Cloud className="h-5 w-5 text-muted-foreground" />;
    case 'partly-cloudy':
      return <CloudSun className="h-5 w-5 text-warning" />;
    case 'rainy':
      return <CloudRain className="h-5 w-5 text-primary" />;
  }
};

const getConditionText = (condition: WeatherData['condition']) => {
  switch (condition) {
    case 'sunny': return 'Güneşli';
    case 'cloudy': return 'Bulutlu';
    case 'partly-cloudy': return 'Parçalı Bulutlu';
    case 'rainy': return 'Yağmurlu';
  }
};

export const ClockWeather = forwardRef<HTMLDivElement>(function ClockWeather(_props, ref) {
  const [time, setTime] = useState(new Date());
  const [selectedDistrict, setSelectedDistrict] = useState("Bağcılar");
  const [weather, setWeather] = useState<WeatherData>(getSimulatedWeather("Bağcılar"));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setWeather(getSimulatedWeather(selectedDistrict));
  }, [selectedDistrict]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div ref={ref} className="flex items-center gap-6">
      {/* Clock & Date */}
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-xl border border-border/50">
        <Clock className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <span className="text-lg font-mono font-bold text-foreground leading-tight">
            {formatTime(time)}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            {formatDate(time)}
          </span>
        </div>
      </div>

      {/* Weather */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-3 px-4 py-6 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary/80"
          >
            <WeatherIcon condition={weather.condition} />
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{weather.temp}°C</span>
                <span className="text-xs text-muted-foreground">{getConditionText(weather.condition)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>İstanbul, {selectedDistrict}</span>
              </div>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">Semt Seçin</h4>
            {DISTRICTS.map((district) => (
              <Button
                key={district}
                variant={selectedDistrict === district ? "secondary" : "ghost"}
                className="w-full justify-between h-9 text-sm"
                onClick={() => {
                  setSelectedDistrict(district);
                  setIsOpen(false);
                }}
              >
                {district}
                {selectedDistrict === district && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});