'use client';

import { useEffect, useState } from 'react';

export function SeasonalBackground() {
  const [stars, setStars] = useState([]);
  const [clouds, setClouds] = useState([]);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    };

    // Initial check
    checkTheme();

    // Generate stars - only in dark mode
    const dark = document.documentElement.classList.contains('dark');
    if (dark) {
      const starList = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        opacity: Math.random() * 0.8 + 0.3,
        delay: Math.random() * 3,
      }));
      setStars(starList);
    }

    // Generate clouds - ALWAYS (both light and dark mode)
    // 7km/h speed = slow smooth movement across screen
    const cloudList = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: -20 + Math.random() * 120,
      top: Math.random() * 90,
      duration: 80 + Math.random() * 40, // 80-120 seconds = slow 7km/h feel
      delay: Math.random() * 40,
      scale: 0.5 + Math.random() * 1.0,
    }));
    setClouds(cloudList);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      setIsDark(newIsDark);
      if (newIsDark) {
        const starList = Array.from({ length: 100 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: Math.random() * 2.5 + 0.8,
          opacity: Math.random() * 0.8 + 0.3,
          delay: Math.random() * 3,
        }));
        setStars(starList);
      } else {
        setStars([]);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Full Page Background Container */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-50">
        {/* Night sky background - only visible in dark mode */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950/60 to-slate-900">
            {/* Moon with soft glow */}
            <div className="absolute top-12 right-20 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-yellow-200/90 blur-sm" />
              <div className="absolute inset-0 rounded-full bg-yellow-100/60 blur-lg scale-150" />
              <div className="absolute inset-0 rounded-full bg-yellow-50/30 blur-2xl scale-200 animate-pulse" style={{ animationDuration: '6s' }} />
            </div>
            
            {/* Twinkling Stars */}
            {stars.map((star) => (
              <div
                key={`star-${star.id}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: star.size,
                  height: star.size,
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  opacity: star.opacity,
                  animation: `twinkle 2.5s ease-in-out ${star.delay}s infinite`,
                  boxShadow: '0 0 2px rgba(255,255,255,0.8)',
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Light mode subtle gradient background */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-white/20 to-blue-100/30" />
        </div>
        
        {/* Clouds - Always visible in both modes */}
        {clouds.map(cloud => (
          <div
            key={`cloud-${cloud.id}`}
            className={`absolute ${isDark ? 'opacity-10' : 'opacity-15'}`}
            style={{
              left: `${cloud.left}%`,
              top: `${cloud.top}%`,
              animation: `cloudDrift ${cloud.duration}s linear ${cloud.delay}s infinite, cloudWave 8s ease-in-out infinite`,
              '--cloud-scale': cloud.scale,
            }}
          >
            <div className="relative" style={{ transform: `scale(${cloud.scale})` }}>
              {/* Cloud shape - different color for light/dark mode */}
              <div className={`w-24 h-12 rounded-full blur-sm ${isDark ? 'bg-gray-300' : 'bg-slate-200'}`} />
              <div className={`absolute top-0 left-8 w-20 h-14 rounded-full blur-sm ${isDark ? 'bg-gray-300' : 'bg-slate-200'}`} />
              <div className={`absolute top-2 left-16 w-16 h-12 rounded-full blur-sm ${isDark ? 'bg-gray-300' : 'bg-slate-200'}`} />
              <div className={`absolute -bottom-4 left-10 w-12 h-6 rounded-full blur-sm ${isDark ? 'bg-gray-300' : 'bg-slate-200'}`} />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes cloudDrift {
          0% {
            transform: translateX(-20vw);
          }
          100% {
            transform: translateX(120vw);
          }
        }

        @keyframes cloudWave {
          0%, 100% {
            margin-top: 0;
          }
          50% {
            margin-top: -15px;
          }
        }
      `}</style>
    </>
  );
}
