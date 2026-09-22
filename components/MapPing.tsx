"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function MapPing({ selectedCountry }) {
  const [countriesData, setCountriesData] = useState([]);
  
  // Render tetikleyiciler
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isAutoPanning, setIsAutoPanning] = useState(false);

  // Matematiksel hesaplamalarda gecikmeyi önlemek için eşzamanlı (synchronous) referanslar
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef(null);

  // 1. Koordinatları Çek
  useEffect(() => {
    fetch('/playable_countries.json')
      .then(res => res.json())
      .then(data => setCountriesData(data))
      .catch(err => console.error("Ülke verisi alınamadı:", err));
  }, []);

  const currentCountryObj = countriesData.find(c => c.country === selectedCountry);
  const coords = currentCountryObj?.coordinates || null;

  // Sınırları hesaplayan fonksiyon (Sol üst orijine göre)
  const clampPosition = (x, y, currentScale) => {
    if (!containerRef.current) return { x, y };
    const rect = containerRef.current.getBoundingClientRect();
    
    const minX = rect.width - (rect.width * currentScale);
    const minY = rect.height - (rect.height * currentScale);

    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y))
    };
  };

  // State ve Ref'leri aynı anda güncelleyen yardımcı fonksiyon
  const updateTransform = (newX, newY, newScale) => {
    const clamped = clampPosition(newX, newY, newScale);
    scaleRef.current = newScale;
    posRef.current = clamped;
    setScale(newScale);
    setPosition(clamped);
  };

  // 2. Ülke Değiştiğinde Otomatik Odaklanma (Animasyonlu)
  useEffect(() => {
    if (coords && containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      const targetX = (parseFloat(coords.left) / 100) * rect.width;
      const targetY = (parseFloat(coords.top) / 100) * rect.height;
      const targetScale = 6.5;

      const newX = (rect.width / 2) - (targetX * targetScale);
      const newY = (rect.height / 2) - (targetY * targetScale);

      // Animasyonu aç ve hedef konuma git
      setIsAutoPanning(true);
      updateTransform(newX, newY, targetScale);

      // Animasyon bittikten sonra manuel kontroller için animasyonu kapat
      const timeout = setTimeout(() => setIsAutoPanning(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [selectedCountry, coords]);

  // 3. İMLECE DOĞRU ZOOM YAPAN Kusursuz Tekerlek Olayı (Animasyonsuz)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e) => {
      e.preventDefault(); // Sayfanın kaymasını engelle
      
      // Kullanıcı manuel işlem yapıyorsa animasyonu iptal et
      setIsAutoPanning(false);

      const rect = container.getBoundingClientRect();
      
      // Farenin container içindeki piksel konumu
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomIntensity = 0.15;
      const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
      
      const currentScale = scaleRef.current;
      let newScale = currentScale * delta;
      newScale = Math.max(1, Math.min(newScale, 8)); // 1x ile 8x sınırları

      // Anlık konum ve yeni oran ile farenin altındaki pikseli sabitleyen formül
      const ratio = newScale / currentScale;
      const currentPos = posRef.current;
      
      const newX = mouseX - (mouseX - currentPos.x) * ratio;
      const newY = mouseY - (mouseY - currentPos.y) * ratio;

      updateTransform(newX, newY, newScale);
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, []);

  // 4. Sürükleme (Pan) Olayları
  const handleMouseDown = (e) => {
    setIsAutoPanning(false);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    updateTransform(rawX, rawY, scaleRef.current);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 mb-20 flex flex-col items-center px-4">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#CFB53B]/60"></div>
        <h3 className="text-xl font-serif text-[#CFB53B] tracking-[0.2em] uppercase">
          Location & Map Explorer
        </h3>
        <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#CFB53B]/60"></div>
      </div>

      <p className="text-xs text-slate-400 mb-3 italic">
        💡 Tip: You can zoom in on the map using the mouse wheel and navigate by clicking and holding.
      </p>

      <div className="w-full bg-[#0d1322] border border-slate-700/50 rounded-2xl p-3 shadow-2xl backdrop-blur-sm">
        
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-full aspect-[2.75/1] rounded-xl overflow-hidden bg-[#070b14] border border-slate-800/80 shadow-inner cursor-grab active:cursor-grabbing select-none"
        >
          
          <div 
            // isAutoPanning true ise CSS transition çalışır, değilse anında (instant) tepki verir
            className={`absolute inset-0 w-full h-full ${isAutoPanning ? 'transition-transform duration-500 ease-out' : ''}`}
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0'
            }}
          >
            <img 
              src="/1444_map.png"
              alt="1444 World Map" 
              className="w-full h-full object-cover opacity-80 mix-blend-lighten pointer-events-none"
              draggable="false"
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
                <div className="relative flex h-3 w-3 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-[1px] w-[1px] bg-[#FFD700] ring-[0.6px] ring-slate-950/40 shadow-[0_0_6px_#FFD700]"></span>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
      
    </div>
  );
}