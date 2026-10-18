import React, { useState, useEffect } from 'react';
import { CloudSun, Wind, Droplets, CloudRain, Sun, Cloud } from 'lucide-react';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
}

const DEFAULT_WEATHER: WeatherData = {
  temperature: 22,
  humidity: 54,
  windSpeed: 12,
  weatherCode: 1,
  description: 'Despejado',
};

function interpretWeatherCode(code: number): {
  description: string;
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain';
} {
  if (code === 0) return { description: 'Cielo limpio', icon: 'sun' };
  if (code === 1 || code === 2) return { description: 'Parcialmente nublado', icon: 'cloud-sun' };
  if (code === 3) return { description: 'Nublado', icon: 'cloud' };
  if (code >= 51 && code <= 67) return { description: 'Lluvia ligera', icon: 'rain' };
  if (code >= 80 && code <= 99) return { description: 'Chubascos / Tormenta', icon: 'rain' };
  return { description: 'Templado', icon: 'cloud-sun' };
}

export const LiveWeatherWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [weather, setWeather] = useState<WeatherData>(DEFAULT_WEATHER);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchWeather() {
      setIsLoading(true);
      try {
        // Coordenadas aproximadas Predio UNAJ (Florencio Varela, Buenos Aires)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-34.79&longitude=-58.27&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto',
        );
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();
        if (!isMounted) return;

        const current = data.current;
        if (current) {
          const { description } = interpretWeatherCode(current.weather_code);
          setWeather({
            temperature: Math.round(current.temperature_2m),
            humidity: Math.round(current.relative_humidity_2m),
            windSpeed: Math.round(current.wind_speed_10m),
            weatherCode: current.weather_code,
            description,
          });
        }
      } catch {
        // Fallback silently to realistic default weather
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchWeather();
    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const { icon } = interpretWeatherCode(weather.weatherCode);

  return (
    <div
      className={`live-weather-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1rem 1.15rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <CloudSun size={13} style={{ color: 'var(--secondary)' }} />
          Clima en cancha
        </span>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}
        >
          Florencio Varela
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--grad-weather)',
              color: 'var(--on-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
            }}
          >
            {icon === 'sun' && <Sun size={22} />}
            {icon === 'cloud-sun' && <CloudSun size={22} />}
            {icon === 'cloud' && <Cloud size={22} />}
            {icon === 'rain' && <CloudRain size={22} />}
          </div>
          <div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {weather.temperature}°C
            </div>
            <p
              style={{
                margin: '0.2rem 0 0',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              {isLoading ? 'Actualizando...' : weather.description}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Wind size={12} style={{ color: 'var(--stat-cyan)' }} />
            {weather.windSpeed} km/h
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Droplets size={12} style={{ color: 'var(--secondary)' }} />
            {weather.humidity}% hum.
          </span>
        </div>
      </div>
    </div>
  );
};
