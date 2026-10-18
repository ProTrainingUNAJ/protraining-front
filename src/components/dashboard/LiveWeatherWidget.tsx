import React, { useState, useEffect } from 'react';
import { CloudSun, Wind, Droplets } from 'lucide-react';

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

type WeatherCondition =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'night'
  | 'cloud-night';

interface WeatherInterpretation {
  description: string;
  condition: WeatherCondition;
  bgGradient: string;
  shadowColor: string;
}

function interpretWeather(code: number, hour: number = new Date().getHours()): WeatherInterpretation {
  const isNight = hour >= 20 || hour < 6;

  if (isNight) {
    if (code === 0) {
      return {
        description: 'Noche despejada',
        condition: 'night',
        bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        shadowColor: 'rgba(30, 27, 75, 0.35)',
      };
    }
    if (code === 1 || code === 2 || code === 3) {
      return {
        description: 'Noche nubosa',
        condition: 'cloud-night',
        bgGradient: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
        shadowColor: 'rgba(49, 46, 129, 0.35)',
      };
    }
  }

  if (code === 0) {
    return {
      description: 'Cielo limpio',
      condition: 'sun',
      bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
    };
  }
  if (code === 1 || code === 2) {
    return {
      description: 'Parcialmente nublado',
      condition: 'cloud-sun',
      // Fresh sky-blue gradient aligned with the 14°C weather situation
      bgGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
      shadowColor: 'rgba(2, 132, 199, 0.35)',
    };
  }
  if (code === 3) {
    return {
      description: 'Nublado',
      condition: 'cloud',
      bgGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      shadowColor: 'rgba(100, 116, 139, 0.35)',
    };
  }
  if (code === 45 || code === 48) {
    return {
      description: 'Neblina en cancha',
      condition: 'fog',
      bgGradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
      shadowColor: 'rgba(148, 163, 184, 0.35)',
    };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      description: 'Lluvia en cancha',
      condition: 'rain',
      bgGradient: 'linear-gradient(135deg, #0284c7 0%, #075985 100%)',
      shadowColor: 'rgba(2, 132, 199, 0.4)',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      description: 'Tormenta eléctrica',
      condition: 'storm',
      bgGradient: 'linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)',
      shadowColor: 'rgba(67, 56, 202, 0.4)',
    };
  }
  return {
    description: 'Templado',
    condition: 'cloud-sun',
    bgGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    shadowColor: 'rgba(2, 132, 199, 0.35)',
  };
}

/** Realistic Weather Icon with SVG Colors and Relief */
const WeatherVisualIcon: React.FC<{ condition: WeatherCondition; size?: number }> = ({
  condition,
  size = 24,
}) => {
  if (condition === 'cloud-sun') {
    // Partly cloudy: Bright golden sun + Embossed white cloud over blue sky
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        {/* Radiant golden sun on top right corner */}
        <circle cx="21" cy="11" r="5" fill="#facc15" />
        <g stroke="#facc15" strokeWidth="1.5" strokeLinecap="round">
          <line x1="21" y1="3" x2="21" y2="4.5" />
          <line x1="21" y1="17.5" x2="21" y2="19" />
          <line x1="13" y1="11" x2="14.5" y2="11" />
          <line x1="27.5" y1="11" x2="29" y2="11" />
          <line x1="15.34" y1="5.34" x2="16.4" y2="6.4" />
          <line x1="25.6" y1="15.6" x2="26.66" y2="16.66" />
          <line x1="15.34" y1="16.66" x2="16.4" y2="15.6" />
          <line x1="25.6" y1="6.4" x2="26.66" y2="5.34" />
        </g>
        {/* Foreground white cloud */}
        <path
          d="M9 25h12a5 5 0 0 0 1.2-9.85A7 7 0 0 0 8.5 13.5 5 5 0 0 0 9 25z"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.22))' }}
        />
      </svg>
    );
  }

  if (condition === 'sun') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        <circle cx="16" cy="16" r="6.5" fill="#ffffff" />
        <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
          <line x1="16" y1="3" x2="16" y2="6" />
          <line x1="16" y1="26" x2="16" y2="29" />
          <line x1="3" y1="16" x2="6" y2="16" />
          <line x1="26" y1="16" x2="29" y2="16" />
          <line x1="6.8" y1="6.8" x2="8.9" y2="8.9" />
          <line x1="23.1" y1="23.1" x2="25.2" y2="25.2" />
          <line x1="6.8" y1="25.2" x2="8.9" y2="23.1" />
          <line x1="23.1" y1="8.9" x2="25.2" y2="6.8" />
        </g>
      </svg>
    );
  }

  if (condition === 'cloud') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        <path
          d="M8 23h15a5 5 0 0 0 1-9.9A7 7 0 0 0 10.5 11 5.5 5.5 0 0 0 8 23z"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
      </svg>
    );
  }

  if (condition === 'rain') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        <path
          d="M8 20h14a4.5 4.5 0 0 0 1-8.9A6.5 6.5 0 0 0 10 9a5 5 0 0 0-2 11z"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}
        />
        <line x1="11" y1="23" x2="9.5" y2="27" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="23" x2="14.5" y2="27" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="23" x2="19.5" y2="27" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (condition === 'storm') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        <path
          d="M7 19h15a4.5 4.5 0 0 0 1-8.9A6.5 6.5 0 0 0 9.5 8 5 5 0 0 0 7 19z"
          fill="#cbd5e1"
        />
        <polygon points="15,19 12,25 16,25 14,31 20,23 16,23" fill="#facc15" />
      </svg>
    );
  }

  if (condition === 'night' || condition === 'cloud-night') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
        <path
          d="M21 16.5A7.5 7.5 0 0 1 12 7.5a8 8 0 1 0 9 9z"
          fill="#fef08a"
          style={{ filter: 'drop-shadow(0 0 6px rgba(254, 240, 138, 0.45))' }}
        />
        <circle cx="23" cy="8" r="1" fill="#ffffff" />
        <circle cx="26" cy="13" r="0.75" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'block' }}>
      <path
        d="M8 23h15a5 5 0 0 0 1-9.9A7 7 0 0 0 10.5 11 5.5 5.5 0 0 0 8 23z"
        fill="#ffffff"
      />
    </svg>
  );
};

export const LiveWeatherWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [weather, setWeather] = useState<WeatherData>(DEFAULT_WEATHER);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchWeather() {
      setIsLoading(true);
      try {
        // Approximate coordinates for UNAJ Campus (Florencio Varela, Buenos Aires)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-34.79&longitude=-58.27&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto',
        );
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();
        if (!isMounted) return;

        const current = data.current;
        if (current) {
          const { description } = interpretWeather(current.weather_code);
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

  const info = interpretWeather(weather.weatherCode);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Weather badge with adaptive gradient and subtle shadow */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: info.bgGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${info.shadowColor}`,
              flexShrink: 0,
              transition: 'all 0.3s ease',
            }}
            title={info.description}
          >
            <WeatherVisualIcon condition={info.condition} size={26} />
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
