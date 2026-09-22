"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MapPing from '../components/MapPing';

export default function Home() {
  const [achievementsData, setAchievementsData] = useState<any[]>([]);
  const [playableCountries, setPlayableCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [countryAchievements, setCountryAchievements] = useState<any[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  // Steam Integration States
  const [steamIdInput, setSteamIdInput] = useState('');
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [steamStatus, setSteamStatus] = useState('idle'); 
  const [steamError, setSteamError] = useState('');

  // Scroll Reference
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/achievements.json').then((res) => res.json()),
      fetch('/playable_countries.json').then((res) => res.json())
    ]).then(([achData, countriesData]) => {
      setAchievementsData(achData);
      setPlayableCountries(countriesData);
    }).catch((err) => console.error("JSON fetch error:", err));
  }, []);

  // Check Steam session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('eu4_steam_session');
    if (savedSession) {
      try {
        const { profile, achievements } = JSON.parse(savedSession);
        setUserProfile(profile);
        setUnlockedAchievements(achievements);
        setSteamStatus('success');
      } catch (err: any) {
        console.error("Steam session parse error:", err);
      }
    }
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
      
      localStorage.setItem('eu4_steam_session', JSON.stringify({
        profile: data.profile,
        achievements: data.unlocked
      }));
      
    } catch (err: any) {
      setSteamError(err.message);
      setSteamStatus('error');
    }
  };

  const disconnectSteam = () => {
    setSteamStatus('idle');
    setUnlockedAchievements([]);
    setUserProfile(null);
    setSteamIdInput('');
    
    localStorage.removeItem('eu4_steam_session');
  };

  /*const rollNation = () => {
    if (playableCountries.length === 0) return;
    setIsRolling(true);

    setTimeout(() => {
      const countriesWithAchievements = playableCountries.filter(c => c.achievements && c.achievements.length > 0);
      const randomIndex = Math.floor(Math.random() * countriesWithAchievements.length);
      const randomCountryObj = countriesWithAchievements[randomIndex];

      const matchedAchievements = randomCountryObj.achievements
        .map((achName: string) => achievementsData.find((a) => a.name === achName))
        .filter(Boolean); 

      setSelectedCountry(randomCountryObj.country);
      setCountryAchievements(matchedAchievements);
      setIsRolling(false);

      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    }, 600);
  };*/
  const rollNation = () => {
    if (playableCountries.length === 0) return;
    setIsRolling(true);

    setTimeout(() => {
      // Havuzu filtrele: Sadece başarımı olan VE o başarımlarından en az birini HENÜZ YAPMADIĞIMIZ ülkeleri al
      const eligibleCountries = playableCountries.filter((countryObj) => {
        // 1. Ülkenin kendine has başarımı yoksa direkt çöpe at
        if (!countryObj.achievements || countryObj.achievements.length === 0) {
          return false;
        }

        // 2. Ülkenin başarımlarından en az bir tanesi kilitli mi (yapılmamış mı) kontrol et
        const hasLockedAchievement = countryObj.achievements.some(
          (achName) => !isAchievementUnlocked(achName)
        );

        return hasLockedAchievement;
      });

      if (eligibleCountries.length === 0) {
        setIsRolling(false);
        alert("Tebrikler! Oyundaki filtrelenmiş tüm ülke başarımlarını tamamlamışsın.");
        return;
      }

      // Filtrelenmiş havuzdan rastgele ülke seç
      const randomIndex = Math.floor(Math.random() * eligibleCountries.length);
      const randomCountryObj = eligibleCountries[randomIndex];

      // JSON'dan başarım detaylarını eşleştir
      const matchedAchievements = randomCountryObj.achievements
        .map((achName) => achievementsData.find((a) => a.name === achName))
        .filter(Boolean); 

      setSelectedCountry(randomCountryObj.country);
      setCountryAchievements(matchedAchievements);
      setIsRolling(false);

      // Sonuca yumuşak bir şekilde kaydır
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    }, 600);
  };

  /*const isAchievementUnlocked = (achId: string) => {
    const normalizedId = achId.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return unlockedAchievements.includes(normalizedId) || 
           unlockedAchievements.includes(`achievement_${normalizedId}`);
  };*/
  const isAchievementUnlocked = (achName) => {
    if (!achName || !unlockedAchievements) return false;

    // Aksanları, boşlukları ve HER TÜRLÜ noktalama işaretini silen agresif temizleyici
    const fuzzyClean = (str) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // é, ü, ö gibi harfleri e, u, o yapar
        .replace(/[^a-z0-9]/g, "");      // Sadece harf ve rakamları bırakır
    };

    const cleanWiki = fuzzyClean(achName);

    // Steam'den gelen doğru 'displayName' listesini fuzzy mantığıyla tara
    return unlockedAchievements.some(steamName => {
      const cleanSteam = fuzzyClean(steamName);
      
      // Tam eşleşme veya Steam'in "the" takısını yutması gibi durumlar için kapsama (includes) kontrolü
      return cleanSteam === cleanWiki || cleanSteam.includes(cleanWiki) || cleanWiki.includes(cleanSteam);
    });
  };

  return (
    <main suppressHydrationWarning className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-[#CFB53B] selection:text-slate-900 flex flex-col relative">
      
      {userProfile && (
  <div className="absolute top-6 right-6 z-50 flex items-center gap-4 bg-slate-900/90 border border-[#CFB53B]/50 p-3 rounded-xl shadow-[0_0_15px_rgba(207,181,59,0.15)] backdrop-blur w-72">
    <img src={userProfile.avatar} alt={userProfile.name} className="w-12 h-12 rounded border border-[#CFB53B]/70 shadow-sm" />
    <div className="flex flex-col flex-1">
      <div className="flex justify-between items-start mb-1">
  <span className="text-[#CFB53B] font-bold text-sm leading-tight truncate max-w-[120px]" title={userProfile.name}>
    {userProfile.name}
  </span>
  <div className="flex gap-3 items-center">

    <button onClick={disconnectSteam} className="text-slate-400 hover:text-red-400 text-[10px] uppercase font-bold tracking-wider transition-colors mt-0.5">
      Disconnect
    </button>
  </div>
</div>
      
      <div className="w-full mt-1.5">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold tracking-widest uppercase">
          <span>Progress</span>
          <span className="text-[#CFB53B]">{unlockedAchievements.length} / 374</span>
        </div>
        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className="h-full bg-gradient-to-r from-[#8A6D12] via-[#CFB53B] to-[#FFF3A3] transition-all duration-1000 ease-out" 
            style={{ width: `${Math.min((unlockedAchievements.length / 374) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
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
                  placeholder="Steam ID64 (e.g., 76561...)" 
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
          <div ref={resultsRef} className="max-w-4xl mx-auto px-4 my-16 transition-all duration-700 ease-in-out pt-8">
            
            <div className="text-center mb-8 flex flex-col items-center">
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
                  <div key={ach.id} className={`p-3 flex gap-3 transition-all duration-300 shadow-lg rounded-lg border ${isUnlocked ? 'bg-green-950/20 border-green-700/50 opacity-60' : 'bg-slate-900/80 border-slate-800 hover:border-[#CFB53B]/50'}`}>
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
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className={`text-xl font-bold leading-tight ${isUnlocked ? 'text-green-400' : 'text-[#CFB53B]'}`}>{ach.name}</h3>
                        <span className="shrink-0 mt-0.5 text-xs px-2 py-1 bg-slate-950 text-slate-400 rounded border border-slate-700/50">
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
            {selectedCountry && <MapPing selectedCountry={selectedCountry} />}
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