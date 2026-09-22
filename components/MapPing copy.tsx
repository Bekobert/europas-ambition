"use client";

import React, { useState, useEffect } from 'react';

export default function MapPing({ selectedCountry }) {
  const [coordinatesMap, setCoordinatesMap] = useState({});

  useEffect(() => {
    fetch('/coordinates.json')
      .then(res => res.json())
      .then(data => {
        setCoordinatesMap(data);
        console.log("Koordinat JSON Yüklendi. Örnek Anahtarlar:", Object.keys(data).slice(0, 5));
      })
      .catch(err => console.error("Koordinat verisi alınamadı:", err));
  }, []);

  // Gelen ülke adını konsola yazdırıp eşleşmeyi kontrol edelim
  console.log("Seçilen Ülke:", selectedCountry);
  const coords = coordinatesMap[selectedCountry] || null;
  console.log("Bulunan Koordinat:", coords);

  const zoomLevel = 3.5; // Aşırı taşmayı engellemek için 3.5 kat idealdir

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 mb-20 flex flex-col items-center px-4">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#CFB53B]/60"></div>
        <h3 className="text-xl font-serif text-[#CFB53B] tracking-[0.2em] uppercase">
          Location
        </h3>
        <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#CFB53B]/60"></div>
      </div>

      <div className="w-full bg-[#0d1322] border border-slate-700/50 rounded-2xl p-3 shadow-2xl backdrop-blur-sm">
        
        {/* overflow-hidden dış taşmayı keser, relative zoom merkezi için şarttır */}
        <div className="relative w-full aspect-[2.75/1] rounded-xl overflow-hidden bg-[#070b14] border border-slate-800/80 shadow-inner">
          
          <div 
            className="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
            style={{ 
              transformOrigin: coords ? `${coords.left} ${coords.top}` : 'center center',
              transform: coords ? `scale(${zoomLevel})` : 'scale(1)'
            }}
          >
            <img 
              src="/1444_map.png"
              alt="1444 World Map" 
              className="w-full h-full object-cover opacity-80 mix-blend-lighten"
            />

            {coords && (
              <div 
                className="absolute z-50 pointer-events-none"
                style={{ 
                  top: coords.top, 
                  left: coords.left, 
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Ping Noktası - Zoom'dan etkilenmemesi için dışta tutuldu */}
                <div className="relative flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-70"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-[#FFD750] border border-slate-950 shadow-[0_0_2px_#FFD700]"></span>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
      
    </div>
  );
}