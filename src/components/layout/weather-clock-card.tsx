"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sun, Moon, Cloud, CloudDrizzle, CloudRain, 
  Snowflake, CloudLightning, MapPin, ChevronDown 
} from "lucide-react";

const CITIES = [
  "Auto Detect",
  "Hanoi",
  "Ho Chi Minh City"
];

function getWeatherInfo(code: number, isDay: boolean = true) {
  if (code === 0) return { Icon: isDay ? Sun : Moon, color: isDay ? "text-yellow-400 fill-yellow-400/20" : "text-blue-300 fill-blue-300/20", desc: "Clear" };
  if (code === 1 || code === 2) return { Icon: isDay ? Sun : Moon, color: isDay ? "text-yellow-400/80" : "text-blue-300/80", desc: "Partly cloudy" };
  if (code === 3) return { Icon: Cloud, color: "text-gray-400 fill-gray-400/20", desc: "Mostly cloudy" };
  if (code >= 51 && code <= 67) return { Icon: CloudDrizzle, color: "text-blue-400 fill-blue-400/20", desc: "Rainy" };
  if (code >= 71 && code <= 77) return { Icon: Snowflake, color: "text-blue-200", desc: "Snowy" };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, color: "text-blue-500 fill-blue-500/20", desc: "Showers" };
  if (code >= 95) return { Icon: CloudLightning, color: "text-purple-400 fill-purple-400/20", desc: "Thunderstorm" };
  return { Icon: isDay ? Sun : Moon, color: isDay ? "text-yellow-400" : "text-blue-300", desc: "Clear" };
}

function getTempStyle(temp: number) {
  if (temp < 10) return { text: "text-cyan-500 dark:text-cyan-400", bg: "from-cyan-500/10" };
  if (temp < 20) return { text: "text-blue-500 dark:text-blue-400", bg: "from-blue-500/10" };
  if (temp < 28) return { text: "text-emerald-500 dark:text-emerald-400", bg: "from-emerald-500/10" };
  if (temp < 35) return { text: "text-orange-500 dark:text-orange-400", bg: "from-orange-500/10" };
  return { text: "text-red-500 dark:text-red-400", bg: "from-red-500/10" };
}

interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    code: number;
    isDay: boolean;
  };
  daily: {
    time: string[];
    code: number[];
    maxTemp: number[];
    minTemp: number[];
  };
  location: string;
}

let geoPromise: Promise<GeolocationPosition | null> | null = null;

export default function WeatherClockCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [time, setTime] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("weather_city") || "Hanoi";
    }
    return "Hanoi";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchWeather = async () => {
      setLoading(true);
      try {
        let lat = 21.0285;
        let lon = 105.8542;
        let city = "Hanoi";

        if (selectedCity === "Auto Detect") {
          const savedCoordsStr = localStorage.getItem("weather_auto_coords");
          let useSaved = false;
          if (savedCoordsStr) {
            try {
              const saved = JSON.parse(savedCoordsStr);
              // Cache coordinates for 24 hours
              if (Date.now() - saved.timestamp < 24 * 60 * 60 * 1000) {
                lat = saved.lat;
                lon = saved.lon;
                city = "Current Location";
                useSaved = true;
              }
            } catch {}
          }

          if (!useSaved) {
            if (!geoPromise) {
              geoPromise = new Promise<GeolocationPosition>((res, rej) => {
                navigator.geolocation.getCurrentPosition(res, rej, { maximumAge: 60000, timeout: 15000 });
              }).catch(() => null);
            }
            const pos = await geoPromise;
            
            if (pos) {
              lat = pos.coords.latitude;
              lon = pos.coords.longitude;
              city = "Current Location";
              localStorage.setItem("weather_auto_coords", JSON.stringify({ 
                lat, lon, timestamp: Date.now() 
              }));
            }
          }
        } else {
          city = selectedCity;
          const cityCoords: Record<string, { lat: number; lon: number }> = {
            "Hanoi": { lat: 21.0285, lon: 105.8542 },
            "Ho Chi Minh City": { lat: 10.8231, lon: 106.6297 },
          };
          if (cityCoords[city]) {
            lat = cityCoords[city].lat;
            lon = cityCoords[city].lon;
          }
        }

        const cacheKey = `weather_cache_${lat}_${lon}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            if (!isCancelled) {
              setWeather(parsed.data);
              setLoading(false);
            }
            return;
          }
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();

        if (!isCancelled) {
          const newWeather = {
            current: {
              temp: data.current.temperature_2m,
              humidity: data.current.relative_humidity_2m,
              precipitation: data.current.precipitation,
              windSpeed: data.current.wind_speed_10m,
              code: data.current.weather_code,
              isDay: data.current.is_day === 1,
            },
            daily: {
              time: data.daily.time,
              code: data.daily.weather_code,
              maxTemp: data.daily.temperature_2m_max,
              minTemp: data.daily.temperature_2m_min,
            },
            location: city,
          };
          
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: newWeather
          }));
          
          setWeather(newWeather);
        }
      } catch (error) {
        if (!isCancelled) console.error("Failed to fetch weather", error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => {
      isCancelled = true;
      clearInterval(weatherTimer);
    };
  }, [selectedCity]);

  const tempStyle = weather ? getTempStyle(weather.current.temp) : { text: "text-primary", bg: "from-primary/10" };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 flex flex-col glassmorphism relative min-h-[160px] w-full overflow-hidden transition-colors duration-1000">
      <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${tempStyle.bg} via-transparent to-transparent pointer-events-none z-0 transition-colors duration-1000`} />

      {loading && !weather ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-muted mb-3"></div>
            <div className="h-4 w-24 bg-muted rounded"></div>
          </div>
        </div>
    ) : weather ? (
        <div className="flex flex-col h-full relative z-10">
          {/* HEADER SECTION (Google Style) */}
          <div className="flex flex-col sm:flex-row justify-between mb-8 gap-6 sm:gap-4 mt-1 sm:mt-0">
            {/* Left side: Location + Icon + Temp + Details */}
            <div className="flex flex-col gap-1.5">
              {/* City Selector */}
              <div className="relative z-20 inline-flex" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-1.5 text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors outline-none w-max -ml-1 px-1 py-1 rounded-md"
                  title="Select region"
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {selectedCity === "Auto Detect" ? weather.location : selectedCity}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
                
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 w-48 rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none z-50 p-1 animate-in fade-in-80 zoom-in-95">
                    {CITIES.map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          if (city !== selectedCity) setLoading(true);
                          setSelectedCity(city);
                          localStorage.setItem("weather_city", city);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors ${
                          city === selectedCity
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-start gap-4">
                  {(() => {
                    const { Icon, color } = getWeatherInfo(weather.current.code, weather.current.isDay);
                    return <Icon className={`w-16 h-16 shrink-0 drop-shadow-md ${color}`} />;
                  })()}
                  
                  <div className={`flex items-start transition-colors duration-1000 ${tempStyle.text}`}>
                    <span className="text-[64px] font-medium tracking-tighter tabular-nums leading-[0.8] mt-1">
                      {Math.round(weather.current.temp)}
                    </span>
                    <div className="flex flex-col ml-1.5 mt-1 font-medium text-lg">
                      <span>°C</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground justify-center hidden sm:flex ml-2">
                  <span>Precipitation: <span className="text-foreground/80">{weather.current.precipitation} mm</span></span>
                  <span>Humidity: <span className="text-foreground/80">{weather.current.humidity}%</span></span>
                  <span>Wind: <span className="text-foreground/80">{weather.current.windSpeed} km/h</span></span>
                </div>
              </div>
            </div>

            {/* Right side: Clock & Weather string */}
            <div className="flex flex-col text-left sm:text-right relative z-10">
              <span className={`text-lg font-semibold tracking-tight transition-colors duration-1000 ${tempStyle.text}`}>Weather</span>
              <span className="text-sm text-muted-foreground mt-0.5">
                {time.toLocaleDateString(undefined, { weekday: 'long' })} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-sm text-muted-foreground">
                {getWeatherInfo(weather.current.code, weather.current.isDay).desc}
              </span>
            </div>
          </div>

          {/* Mobile Details (shows below header on small screens) */}
          <div className="flex justify-between text-xs text-muted-foreground mb-6 sm:hidden border-t border-border/50 pt-4">
            <div className="flex flex-col gap-1">
              <span>Precipitation</span>
              <span className="font-medium text-foreground">{weather.current.precipitation} mm</span>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <span>Humidity</span>
              <span className="font-medium text-foreground">{weather.current.humidity}%</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span>Wind</span>
              <span className="font-medium text-foreground">{weather.current.windSpeed} km/h</span>
            </div>
          </div>

          {/* DAILY FORECAST CHART/LIST */}
          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="flex justify-between items-end gap-2 overflow-x-auto pb-2 scrollbar-none">
              {weather.daily.time.slice(0, 7).map((dateStr, index) => {
                const date = new Date(dateStr);
                const dayName = index === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: 'short' });
                const code = weather.daily.code[index];
                const max = Math.round(weather.daily.maxTemp[index]);
                const min = Math.round(weather.daily.minTemp[index]);
                const { Icon, color } = getWeatherInfo(code, true);

                return (
                  <div key={dateStr} className="flex flex-col items-center min-w-[50px] gap-2">
                    <span className="text-xs font-medium text-foreground">{dayName}</span>
                    <Icon className={`w-6 h-6 my-1 ${color}`} />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-foreground">{max}°</span>
                      <span className="text-muted-foreground">{min}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
          No weather data available.
        </div>
      )}
    </div>
  );
}
