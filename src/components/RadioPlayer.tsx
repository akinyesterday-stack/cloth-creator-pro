import { useState, useEffect, useRef, forwardRef } from "react";
import { Radio, X, Play, Pause, Volume2, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Station {
  name: string;
  country: string;
  url: string;
  tags: string;
  geo_lat: number;
  geo_long: number;
}

interface RadioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RadioPlayer = forwardRef<HTMLDivElement, RadioPlayerProps>(
  function RadioPlayer({ isOpen, onClose }, ref) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("Bir ülkeye tıklayın");

    useEffect(() => {
      if (!isOpen || !mapContainerRef.current || mapRef.current) return;

      // Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(mapRef.current);

      // Click handler
      mapRef.current.on("click", async (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        setIsLoading(true);
        setStatus("İstasyonlar aranıyor...");

        try {
          // Fetch stations by geolocation
          const response = await fetch(
            `https://de1.api.radio-browser.info/json/stations/search?limit=10&has_geo_info=true&order=clickcount&reverse=true`
          );
          const allStations: Station[] = await response.json();
          
          // Find nearest station with geo info
          let nearestStation: Station | null = null;
          let minDistance = Infinity;
          
          for (const station of allStations) {
            if (station.geo_lat && station.geo_long && station.url) {
              const distance = Math.sqrt(
                Math.pow(station.geo_lat - lat, 2) + Math.pow(station.geo_long - lng, 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                nearestStation = station;
              }
            }
          }
          
          if (!nearestStation) {
            // Fallback: get any popular station
            const fallbackResponse = await fetch(
              `https://de1.api.radio-browser.info/json/stations/topclick/20`
            );
            const popularStations: Station[] = await fallbackResponse.json();
            nearestStation = popularStations.find(s => s.url) || null;
          }

          if (nearestStation) {
            playStation(nearestStation);
          } else {
            setStatus("Radyo bulunamadı, başka bir yere tıklayın.");
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
    }, [isOpen]);

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
          
          mapRef.current.setView([station.geo_lat, station.geo_long], 5);
        }
      }

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = station.url;
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

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-4xl h-[80vh] mx-4 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Dünya Radyo Haritası</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <div ref={mapContainerRef} className="absolute inset-0" />
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
