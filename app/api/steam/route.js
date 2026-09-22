import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get('steamId');
  const apiKey = process.env.STEAM_API_KEY;

  if (!steamId || !apiKey) {
    return NextResponse.json({ error: 'Steam ID veya API Key eksik.' }, { status: 400 });
  }

  try {
    // Profil isteği (cache yasaklı)
    const profileRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`,
      { cache: 'no-store' }
    );
    const profileData = await profileRes.json();
    const player = profileData?.response?.players?.[0];

    if (!player) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    // 2. Kullanıcının Açtığı Başarımları Çek (Sadece 'apiname' listesi döner)
    const achRes = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=236850&key=${apiKey}&steamid=${steamId}`,
      { cache: 'no-store' }
    );
    const achData = await achRes.json();
    
    if (!achData.playerstats || !achData.playerstats.success) {
       return NextResponse.json({ error: 'Profil gizli veya oyun bulunamadı.' }, { status: 403 });
    }

    // Sadece 'achieved: 1' olanların apiname kodlarını bir diziye al
    const unlockedApiNames = achData.playerstats.achievements
      .filter(a => a.achieved === 1)
      .map(a => a.apiname);

    // 3. Oyun Şemasını Çek (Tüm başarımların 'apiname' ve 'displayName' eşleştirmeleri)
    const schemaRes = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=236850&key=${apiKey}`,
      { next: { revalidate: 86400 } }
    );
    const schemaData = await schemaRes.json();
    const schemaAchievements = schemaData.game.availableGameStats.achievements || [];

    // 4. Şema üzerinden apiname'leri eşleştirip doğrudan displayName'leri (Gerçek İsimleri) al
    const unlockedDisplayNames = schemaAchievements
      .filter(a => unlockedApiNames.includes(a.name))
      .map(a => a.displayName);

    // 5. Frontend'e sadece temiz ve okunabilir isimleri gönder
    return NextResponse.json({
      profile: {
        name: player.personaname,
        avatar: player.avatarfull
      },
      unlocked: unlockedDisplayNames
    });

  } catch (error) {
    return NextResponse.json({ error: 'Steam API ile iletişim kurulamadı.' }, { status: 500 });
  }
}