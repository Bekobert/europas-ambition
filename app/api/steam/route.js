import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get('steamId');

  if (!steamId) {
    return NextResponse.json({ error: 'Steam ID gerekli' }, { status: 400 });
  }

  const apiKey = process.env.STEAM_API_KEY;
  const appId = '236850'; // Europa Universalis IV

  try {
    // 1. Oyuncu Başarımlarını Çek
    const achRes = await fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${apiKey}&steamid=${steamId}`);
    const achData = await achRes.json();

    if (!achData.playerstats || !achData.playerstats.success) {
       return NextResponse.json({ error: 'Profil gizli veya geçersiz Steam ID64' }, { status: 404 });
    }

    const unlocked = achData.playerstats.achievements
      .filter(ach => ach.achieved === 1)
      .map(ach => ach.apiname.toLowerCase());

    // 2. Oyuncu Profil Bilgilerini Çek (İsim ve Avatar)
    const profileRes = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`);
    const profileData = await profileRes.json();
    
    let profile = null;
    if (profileData.response && profileData.response.players && profileData.response.players.length > 0) {
        const p = profileData.response.players[0];
        profile = {
            name: p.personaname,
            avatar: p.avatarfull // En yüksek kaliteli profil fotoğrafı
        };
    }

    return NextResponse.json({ unlocked, profile });
  } catch (error) {
    return NextResponse.json({ error: 'Steam sunucularına bağlanılamadı' }, { status: 500 });
  }
}