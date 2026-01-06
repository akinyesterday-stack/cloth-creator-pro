import { useState, useEffect, forwardRef, useCallback } from "react";
import { Clock, Cloud, CloudRain, Sun, CloudSun, MapPin, Settings, Check, Loader2, Radio, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioPlayer } from "./RadioPlayer";

interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'partly-cloudy' | 'rainy';
  humidity: number;
  windSpeed: number;
}

interface LocationInfo {
  name: string;
  lat: number;
  lon: number;
  isCustom?: boolean;
}

const DEFAULT_DISTRICTS: LocationInfo[] = [
  { name: "Bağcılar", lat: 41.0397, lon: 28.8573 },
  { name: "Şirinevler", lat: 40.9983, lon: 28.8378 },
  { name: "Bakırköy", lat: 40.9819, lon: 28.8772 },
  { name: "Beylikdüzü", lat: 41.0054, lon: 28.6407 },
  { name: "Esenyurt", lat: 41.0286, lon: 28.6772 },
  { name: "Küçükçekmece", lat: 41.0014, lon: 28.7747 },
  { name: "Bahçelievler", lat: 41.0011, lon: 28.8622 },
  { name: "Güngören", lat: 41.0136, lon: 28.8772 },
];

// Determine weather condition based on cloud cover and precipitation
const getConditionFromWeather = (cloudCover: number, precipitation: number): WeatherData['condition'] => {
  if (precipitation > 0.5) return 'rainy';
  if (cloudCover > 70) return 'cloudy';
  if (cloudCover > 30) return 'partly-cloudy';
  return 'sunny';
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
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo>(DEFAULT_DISTRICTS[0]);
  const [customLocations, setCustomLocations] = useState<LocationInfo[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isRadioMinimized, setIsRadioMinimized] = useState(false);
  
  // Manual location input
  const [manualInput, setManualInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Fetch weather from Open-Meteo API
  const fetchWeather = useCallback(async (location: LocationInfo) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation&timezone=auto`
      );
      
      if (!response.ok) throw new Error('Weather fetch failed');
      
      const data = await response.json();
      const current = data.current;
      
      setWeather({
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        condition: getConditionFromWeather(current.cloud_cover, current.precipitation),
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeather({
        temp: 18,
        condition: 'partly-cloudy',
        humidity: 60,
        windSpeed: 10,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search for location using geocoding API
  const handleSearchLocation = async () => {
    if (!manualInput.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(manualInput)}&count=1&language=tr`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const newLocation: LocationInfo = {
          name: result.admin1 ? `${result.name}, ${result.admin1}` : result.name,
          lat: result.latitude,
          lon: result.longitude,
          isCustom: true,
        };
        
        // Add to custom locations if not exists
        if (!customLocations.some(loc => loc.name === newLocation.name)) {
          setCustomLocations(prev => [...prev, newLocation]);
        }
        
        setSelectedLocation(newLocation);
        setManualInput("");
        setIsOpen(false);
      } else {
        console.error('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveCustomLocation = (locationName: string) => {
    setCustomLocations(prev => prev.filter(loc => loc.name !== locationName));
    if (selectedLocation.name === locationName) {
      setSelectedLocation(DEFAULT_DISTRICTS[0]);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather on mount and when location changes
  useEffect(() => {
    fetchWeather(selectedLocation);
  }, [selectedLocation, fetchWeather]);

  // Refresh weather every 10 minutes
  useEffect(() => {
    const weatherTimer = setInterval(() => {
      fetchWeather(selectedLocation);
    }, 10 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, [selectedLocation, fetchWeather]);

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

  const allLocations = [...DEFAULT_DISTRICTS, ...customLocations];

  const handleRadioClose = () => {
    setIsRadioOpen(false);
    setIsRadioMinimized(false);
  };

  const handleRadioMinimize = () => {
    setIsRadioMinimized(!isRadioMinimized);
  };

  return (
    <>
      <div ref={ref} className="flex items-center gap-4 flex-wrap">
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
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : weather ? (
                <WeatherIcon condition={weather.condition} />
              ) : null}
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <span className="text-lg font-bold text-foreground">--°C</span>
                  ) : weather ? (
                    <>
                      <span className="text-lg font-bold text-foreground">{weather.temp}°C</span>
                      <span className="text-xs text-muted-foreground">{getConditionText(weather.condition)}</span>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{selectedLocation.name}</span>
                </div>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-3">
              {/* Manual Input */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Manuel Konum Gir</h4>
                <div className="flex gap-2">
                  <Input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Şehir, ilçe veya ülke..."
                    className="h-9 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchLocation()}
                  />
                  <Button
                    size="sm"
                    onClick={handleSearchLocation}
                    disabled={isSearching || !manualInput.trim()}
                    className="h-9 px-3"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom Locations */}
              {customLocations.length > 0 && (
                <div className="border-t border-border pt-3">
                  <h4 className="font-medium text-sm mb-2">Eklenen Konumlar</h4>
                  <div className="space-y-1">
                    {customLocations.map((location) => (
                      <div key={location.name} className="flex items-center gap-1">
                        <Button
                          variant={selectedLocation.name === location.name ? "secondary" : "ghost"}
                          className="flex-1 justify-between h-8 text-sm"
                          onClick={() => {
                            setSelectedLocation(location);
                            setIsOpen(false);
                          }}
                        >
                          <span className="truncate">{location.name}</span>
                          {selectedLocation.name === location.name && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveCustomLocation(location.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <h4 className="font-medium text-sm mb-2">Hazır Konumlar</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {DEFAULT_DISTRICTS.map((location) => (
                    <Button
                      key={location.name}
                      variant={selectedLocation.name === location.name ? "secondary" : "ghost"}
                      className="w-full justify-between h-8 text-sm"
                      onClick={() => {
                        setSelectedLocation(location);
                        setIsOpen(false);
                      }}
                    >
                      <span className="truncate">{location.name}</span>
                      {selectedLocation.name === location.name && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Radio Button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-4 py-6 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary/80"
          onClick={() => {
            setIsRadioOpen(true);
            setIsRadioMinimized(false);
          }}
        >
          <Radio className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Radyo</span>
        </Button>
      </div>

      {/* Radio Player Modal */}
      <RadioPlayer 
        isOpen={isRadioOpen} 
        onClose={handleRadioClose}
        isMinimized={isRadioMinimized}
        onMinimize={handleRadioMinimize}
      />
    </>
  );
});
