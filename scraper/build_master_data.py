import os
import json
import re
from bs4 import BeautifulSoup

def normalize_text(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())

def normalize_for_match(text):
    # Eşleştirme için boşlukları ve özel karakterleri sil
    t = re.sub(r'[^a-z0-9]', '', text.lower())
    # Wiki'deki "The Hedjaz" gibi isimleri oyun dosyasındaki "Hedjaz" ile eşlemek için baştaki "the" kelimesini sil
    if t.startswith('the'):
        t = t[3:]
    return t

def build_master_json():
    base_dir = os.path.dirname(__file__)
    public_dir = os.path.join(base_dir, '..', 'public')
    
    achievements_path = os.path.join(public_dir, 'achievements.json')
    countries_html_path = os.path.join(base_dir, 'wiki_pages', 'countries', 'Countries.html')
    positions_file = os.path.join(public_dir, 'positions.txt')
    countries_dir = os.path.join(public_dir, 'countries')

    if not all(os.path.exists(p) for p in [achievements_path, countries_html_path, positions_file, countries_dir]):
        print("HATA: Gerekli klasör veya dosyalardan biri eksik.")
        return

    # 1. HARİTA KOORDİNATLARINI ÇIKAR
    print("1. positions.txt okunuyor...")
    province_coords = {}
    with open(positions_file, 'r', encoding='latin-1') as f:
        matches = re.finditer(r"(\d+)\s*=\s*\{.*?position\s*=\s*\{\s*([\d\.]+)\s+([\d\.]+)", f.read(), re.DOTALL)
        for match in matches:
            province_coords[match.group(1)] = (float(match.group(2)), float(match.group(3)))

    # 2. OYUN DOSYALARINDAN TAG'LARI VE ÜLKE İSİMLERİNİ ÇIKAR
    print("2. Oyun dosyalarından TAG'lar ve Koordinatlar eşleştiriliyor...")
    MAP_WIDTH, MAP_HEIGHT = 5632.0, 2048.0
    game_data = {}
    name_to_tag = {}

    for filename in os.listdir(countries_dir):
        if filename.endswith(".txt") and "-" in filename:
            try:
                parts = filename.split('-')
                tag = parts[0].strip()
                # Dosya ismindeki resmi oyun içi adı
                country_name = parts[1].replace('.txt', '').strip() 
                
                with open(os.path.join(countries_dir, filename), 'r', encoding='latin-1') as f:
                    cap_match = re.search(r"capital\s*=\s*(\d+)", f.read())
                    if cap_match:
                        capital_id = cap_match.group(1)
                        if capital_id in province_coords:
                            x, y = province_coords[capital_id]
                            game_data[tag] = {
                                "name": country_name,
                                "coordinates": {
                                    "top": f"{((MAP_HEIGHT - y) / MAP_HEIGHT) * 100:.2f}%",
                                    "left": f"{(x / MAP_WIDTH) * 100:.2f}%"
                                }
                            }
                            # Wiki ismini oyun TAG'ı ile bulabilmek için sözlük oluşturuyoruz
                            name_to_tag[normalize_for_match(country_name)] = tag
            except Exception as e: 
                continue

    # 3. WIKI'DEN BAŞARIMLARI ÇEK VE HER ŞEYİ BİRLEŞTİR
    print("3. Wiki'den başarımlar okunuyor ve ana JSON oluşturuluyor...")
    with open(achievements_path, 'r', encoding='utf-8') as f:
        all_achievements = json.load(f)
    valid_ach_names = {normalize_text(a["name"]): a["name"] for a in all_achievements}

    with open(countries_html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    playable_countries = []
    
    # Oyun dosyaları ile Wiki arasında özel istisnalar varsa buraya ekleyebiliriz
    fallback_tags = {
        "thepapalstate": "PAP",
        "papalstate": "PAP"
    }

    for table in soup.find_all('table', class_='wikitable'):
        for row in table.find_all('tr')[1:]:
            cols = row.find_all(['td', 'th'])
            if len(cols) < 5: continue
            
            wiki_country_name = cols[1].text.strip()
            notes = cols[4].text.strip().lower()

            if notes == "" or "exists in 1444" in notes:
                # WIKI ismini TAG sözlüğümüzde ara
                norm_wiki = normalize_for_match(wiki_country_name)
                tag = name_to_tag.get(norm_wiki) or fallback_tags.get(norm_wiki)
                
                # Eğer oyun dosyasında karşılığı bulunduysa resmi adı ve koordinatları al
                final_name = wiki_country_name
                coords = None
                if tag and tag in game_data:
                    final_name = game_data[tag]["name"]
                    coords = game_data[tag]["coordinates"]

                country_achs = set()
                safe_name = wiki_country_name.lower().replace(' ', '_').replace('/', '_').replace("'", "")
                country_file = os.path.join(base_dir, 'wiki_pages', 'countries', f"{safe_name}.html")
                
                if os.path.exists(country_file):
                    with open(country_file, 'r', encoding='utf-8') as cf:
                        csoup = BeautifulSoup(cf.read(), 'html.parser')
                        ach_span = csoup.find(id=lambda x: x and 'chieve' in x.lower())
                        
                        if ach_span:
                            ach_header = ach_span.parent
                            curr = ach_header.find_next_sibling()
                            
                            while curr and curr.name not in ['h2', 'h3', 'h1']:
                                for a in curr.find_all('a'):
                                    text_norm = normalize_text(a.text.strip())
                                    title_norm = normalize_text(a.get('title', '').strip())
                                    
                                    if text_norm in valid_ach_names:
                                        country_achs.add(valid_ach_names[text_norm])
                                    elif title_norm in valid_ach_names:
                                        country_achs.add(valid_ach_names[title_norm])
                                        
                                curr = curr.find_next_sibling()

                # Ana JSON objesini kurgula
                entry = {
                    "country": final_name,
                    "tag": tag if tag else "UNKNOWN",
                    "achievements": list(country_achs)
                }
                if coords:
                    entry["coordinates"] = coords

                playable_countries.append(entry)

    output_path = os.path.join(public_dir, 'playable_countries.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(playable_countries, f, indent=4, ensure_ascii=False)
        
    print(f"BAŞARILI! TAG'lar ve Koordinatlar ile birlikte {len(playable_countries)} ülke birleştirildi.")

if __name__ == "__main__":
    build_master_json()