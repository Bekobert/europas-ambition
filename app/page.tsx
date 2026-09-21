"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [achievementsData, setAchievementsData] = useState([]);
  const [playableCountries, setPlayableCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryAchievements, setCountryAchievements] = useState([]);
  const [isRolling, setIsRolling] = useState(false);

  // Steam Integration States
  const [steamIdInput, setSteamIdInput] = useState('');
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [steamStatus, setSteamStatus] = useState('idle'); 
  const [steamError, setSteamError] = useState('');

  // Scroll Reference
  const resultsRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/achievements.json').then((res) => res.json()),
      fetch('/playable_countries.json').then((res) => res.json())
    ]).then(([achData, countriesData]) => {
      setAchievementsData(achData);
      setPlayableCountries(countriesData);
    }).catch((err) => console.error("JSON fetch error:", err));
  }, []);

  const connectSteam = async () => {
    if (!steamIdInput || steamIdInput.length !== 17) {
      setSteamError('Please enter a valid 17-digit Steam ID64.');
      setSteamStatus('error');
      return;
    }

    setSteamStatus('loading');
    setSteamError('');

    try {
      const res = await fetch(`/api/steam?steamId=${steamIdInput}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Connection failed.');

      setUnlockedAchievements(data.unlocked);
      setUserProfile(data.profile);
      setSteamStatus('success');
    } catch (err) {
      setSteamError(err.message);
      setSteamStatus('error');
    }
  };

  const disconnectSteam = () => {
    setSteamStatus('idle');
    setUnlockedAchievements([]);
    setUserProfile(null);
    setSteamIdInput('');
  };

  const rollNation = () => {
    if (playableCountries.length === 0) return;
    setIsRolling(true);

    setTimeout(() => {
      const countriesWithAchievements = playableCountries.filter(c => c.achievements && c.achievements.length > 0);
      const randomIndex = Math.floor(Math.random() * countriesWithAchievements.length);
      const randomCountryObj = countriesWithAchievements[randomIndex];

      const matchedAchievements = randomCountryObj.achievements
        .map((achName) => achievementsData.find((a) => a.name === achName))
        .filter(Boolean); 

      setSelectedCountry(randomCountryObj.country);
      setCountryAchievements(matchedAchievements);
      setIsRolling(false);

      // Ekrana veri basıldıktan hemen sonra yumuşak kaydırma işlemini tetikle
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    }, 600);
  };

  const isAchievementUnlocked = (achId) => {
    const normalizedId = achId.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return unlockedAchievements.includes(normalizedId) || 
           unlockedAchievements.includes(`achievement_${normalizedId}`);
  };

  return (
    <main suppressHydrationWarning className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-[#CFB53B] selection:text-slate-900 flex flex-col relative">
      
      {userProfile && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-4 bg-slate-900/90 border border-[#CFB53B]/50 p-2 pr-4 rounded-full shadow-lg backdrop-blur">
          <img src={userProfile.avatar} alt={userProfile.name} className="w-10 h-10 rounded-full border border-slate-700" />
          <div className="flex flex-col">
            <span className="text-[#CFB53B] font-bold text-sm leading-tight">{userProfile.name}</span>
            <button onClick={disconnectSteam} className="text-slate-400 hover:text-red-400 text-xs text-left transition-colors">
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full h-[550px] flex items-center justify-center border-b border-[#CFB53B]/30">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image src="/main2.jpg" alt="Europa's Ambition 4" fill className="object-cover object-top opacity-50 mix-blend-luminosity scale-105" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/60 to-slate-950"></div>
        </div>
        
        <div className="relative z-10 text-center flex flex-col items-center mt-12 w-full max-w-xl px-4">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FFF3A3] to-[#CFB53B] drop-shadow-xl mb-4">
            Europa's Ambition 4
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-8">
            Stop staring at the map. Let fate decide your next achievement run.
          </p>
          
          {steamStatus !== 'success' && (
            <div className="w-full bg-slate-900/80 p-4 rounded border border-slate-700 backdrop-blur mb-8">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Steam ID64 (e.g., 76561198...)" 
                  className="flex-1 bg-slate-950 border border-slate-700 text-sm rounded px-3 py-2 focus:outline-none focus:border-[#CFB53B]"
                  value={steamIdInput}
                  onChange={(e) => setSteamIdInput(e.target.value)}
                />
                <button 
                  onClick={connectSteam}
                  disabled={steamStatus === 'loading'}
                  className="bg-slate-800 hover:bg-slate-700 text-[#CFB53B] border border-slate-600 px-4 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap"
                >
                  {steamStatus === 'loading' ? 'Connecting...' : 'Connect Steam'}
                </button>
              </div>
              {steamStatus === 'error' && <p className="text-red-400 text-xs mt-2 text-left">{steamError}</p>}
            </div>
          )}

          <button 
            onClick={rollNation}
            disabled={isRolling || achievementsData.length === 0}
            className="group relative px-10 py-4 mt-4 bg-gradient-to-b from-slate-800 to-slate-950 border-2 border-[#CFB53B] text-[#CFB53B] font-bold text-xl uppercase tracking-widest hover:from-slate-700 hover:to-slate-900 hover:text-[#FFF3A3] hover:shadow-[0_0_25px_rgba(207,181,59,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(207,181,59,0.2)]"
          >
            {isRolling ? "Rolling..." : "Roll a Nation"}
          </button>
        </div>
      </div>

      <div className="flex-1">
        {selectedCountry && (
          <div ref={resultsRef} className="max-w-5xl mx-auto px-4 my-16 transition-all duration-700 ease-in-out pt-8">
            
            <div className="text-center mb-16 flex flex-col items-center">
              <span className="text-xs font-bold tracking-[0.3em] text-slate-500 uppercase mb-4">Your Destiny</span>
              <h2 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FFF3A3] via-[#CFB53B] to-[#8A6D12] drop-shadow-2xl pb-4 leading-normal">
                {selectedCountry}
              </h2>
              <div className="h-[2px] w-64 bg-gradient-to-r from-transparent via-[#CFB53B] to-transparent mt-4 opacity-70"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {countryAchievements.map((ach) => {
                const isUnlocked = isAchievementUnlocked(ach.id);
                return (
                  <div key={ach.id} className={`p-6 flex gap-6 transition-all duration-300 shadow-lg rounded-lg border ${isUnlocked ? 'bg-green-950/20 border-green-700/50 opacity-60' : 'bg-slate-900/80 border-slate-800 hover:border-[#CFB53B]/50'}`}>
                    {ach.icon_url && (
                      <div className="shrink-0 flex items-center justify-center relative">
                        <img src={ach.icon_url} alt={ach.name} className="w-16 h-16 rounded shadow-md border border-slate-700" />
                        {isUnlocked && (
                          <div className="absolute -top-2 -right-2 bg-green-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-green-800">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className={`text-xl font-bold ${isUnlocked ? 'text-green-400' : 'text-[#CFB53B]'}`}>{ach.name}</h3>
                        <span className="text-xs px-2 py-1 bg-slate-950 text-slate-400 rounded border border-slate-700/50">
                          {ach.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="w-full text-center py-8 mt-auto border-t border-slate-800 text-slate-500 text-xs bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 flex flex-col items-center gap-2">
          <p>
            Europa's Ambition 4 is not affiliated with, endorsed, or sponsored by Valve Corporation or Paradox Interactive. 
            Steam and the Steam logo are trademarks and/or registered trademarks of Valve Corporation. 
            Europa Universalis IV is a registered trademark of Paradox Interactive.
          </p>
          <Link href="/privacy" className="hover:text-[#CFB53B] underline transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}