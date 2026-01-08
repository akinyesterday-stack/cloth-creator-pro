import { useState, useEffect, useRef, forwardRef } from "react";
import { Radio, X, Play, Pause, Volume2, MapPin, Globe, Minimize2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Station {
  name: string;
  country: string;
  countrycode: string;
  url: string;
  url_resolved: string;
  tags: string;
  geo_lat: number;
  geo_long: number;
  favicon: string;
}

interface RadioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export const RadioPlayer = forwardRef<HTMLDivElement, RadioPlayerProps>(
  function RadioPlayer({ isOpen, onClose, isMinimized = false, onMinimize }, ref) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("Bir ülkeye tıklayın");
    const [stationList, setStationList] = useState<Station[]>([]);
    const [showList, setShowList] = useState(false);

    useEffect(() => {
      if (!isOpen || isMinimized || !mapContainerRef.current || mapRef.current) return;

      // Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(mapRef.current);

      // Click handler - fetch stations by country using coordinates
      mapRef.current.on("click", async (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        setIsLoading(true);
        setStatus("İstasyonlar aranıyor...");
        setStationList([]);

        try {
          // First, get country from coordinates using reverse geocoding
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3`
          );
          const geoData = await geoResponse.json();
          const countryCode = geoData.address?.country_code?.toUpperCase();
          
          if (!countryCode) {
            setStatus("Lütfen bir kara parçasına tıklayın");
            setIsLoading(false);
            return;
          }

          // Fetch stations by country code - try multiple API servers for better results
          const apiServers = [
            'de1.api.radio-browser.info',
            'nl1.api.radio-browser.info', 
            'at1.api.radio-browser.info'
          ];
          
          let stations: Station[] = [];
          
          for (const server of apiServers) {
            try {
              const response = await fetch(
                `https://${server}/json/stations/bycountrycodeexact/${countryCode}?hidebroken=true&order=clickcount&reverse=true&limit=100`
              );
              const data: Station[] = await response.json();
              if (data && data.length > stations.length) {
                stations = data;
              }
              if (stations.length >= 30) break; // Good enough
            } catch (e) {
              console.log(`Server ${server} failed, trying next...`);
            }
          }
          
          // Filter stations with valid URLs
          const validStations = stations.filter(s => s.url_resolved || s.url);

          if (validStations.length > 0) {
            setStationList(validStations);
            setStatus(`${geoData.address?.country || countryCode}: ${validStations.length} istasyon bulundu`);
            
            // Auto-play first station
            playStation(validStations[0]);
            
            // Center map on country
            if (validStations[0].geo_lat && validStations[0].geo_long) {
              mapRef.current?.setView([validStations[0].geo_lat, validStations[0].geo_long], 5);
            }
          } else {
            setStatus(`${geoData.address?.country || "Bu bölgede"} radyo bulunamadı`);
          }
        } catch (error) {
          console.error("Radio fetch error:", error);
          setStatus("Bağlantı hatası!");
        } finally {
          setIsLoading(false);
        }
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, [isOpen, isMinimized]);

    const playStation = (station: Station) => {
      setCurrentStation(station);
      setStatus(`Şu an çalıyor: ${station.country || "Bilinmeyen Ülke"}`);

      // Update marker
      if (mapRef.current) {
        if (markerRef.current) {
          markerRef.current.remove();
        }
        
        if (station.geo_lat && station.geo_long) {
          markerRef.current = L.marker([station.geo_lat, station.geo_long])
            .addTo(mapRef.current)
            .bindPopup(`<b>${station.name}</b><br/>${station.country}`)
            .openPopup();
        }
      }

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = station.url_resolved || station.url;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    };

    const togglePlay = () => {
      if (!audioRef.current || !currentStation) return;
      
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    };

    const handleMinimize = () => {
      onMinimize?.();
    };

    if (!isOpen) return null;

    // Minimized view - small floating player
    if (isMinimized) {
      return (
        <div
          ref={ref}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl animate-fade-in"
        >
          <Button
            onClick={togglePlay}
            disabled={!currentStation || isLoading}
            size="icon"
            className="h-12 w-12 rounded-full gradient-primary shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <div className="flex flex-col min-w-0 max-w-[200px]">
            <p className="font-medium text-sm truncate">
              {currentStation?.name || "İstasyon Seçilmedi"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentStation?.country || "Radyo"}
            </p>
          </div>

          {isPlaying && (
            <Volume2 className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-8 w-8 rounded-full hover:bg-secondary"
          >
            <Globe className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>

          <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && handleMinimize()}
      >
        <div className="w-full max-w-5xl h-[75vh] mx-4 mb-8 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Dünya Radyo Haritası</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleMinimize} 
                className="rounded-full hover:bg-secondary"
                title="Küçült (Arka planda çalmaya devam eder)"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Map + Station List */}
          <div className="flex-1 flex relative">
            <div ref={mapContainerRef} className="flex-1" />
            
            {/* Station List Panel */}
            {stationList.length > 0 && (
              <div className="w-80 border-l border-border/50 bg-background/80 backdrop-blur-sm flex flex-col">
                <div className="p-3 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{stationList.length} İstasyon</span>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {stationList.map((station, index) => (
                      <button
                        key={`${station.name}-${index}`}
                        onClick={() => playStation(station)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          currentStation?.name === station.name && currentStation?.url === station.url
                            ? "bg-primary/20 border border-primary/30"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {station.favicon ? (
                            <img 
                              src={station.favicon} 
                              alt="" 
                              className="w-8 h-8 rounded object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                              <Radio className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{station.name}</p>
                            {station.tags && (
                              <p className="text-xs text-muted-foreground truncate">
                                {station.tags.split(",").slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                          {currentStation?.name === station.name && 
                           currentStation?.url === station.url && 
                           isPlaying && (
                            <Volume2 className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Glass Player Panel */}
          <div className="p-6 bg-background/60 backdrop-blur-xl border-t border-border/30">
            <div className="flex items-center gap-6">
              {/* Play Button */}
              <Button
                onClick={togglePlay}
                disabled={!currentStation || isLoading}
                size="lg"
                className="h-14 w-14 rounded-full gradient-primary shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>

              {/* Station Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="font-bold text-foreground truncate">
                    {currentStation?.name || "İstasyon Seçilmedi"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{status}</span>
                </div>
                {currentStation?.tags && (
                  <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                    {currentStation.tags.split(",").slice(0, 3).join(", ")}
                  </p>
                )}
              </div>

              {/* Volume Icon */}
              {isPlaying && (
                <div className="flex items-center gap-2 text-primary animate-pulse">
                  <Volume2 className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        </div>
      </div>
    );
  }
);
