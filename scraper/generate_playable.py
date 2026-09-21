import os
import json
import re
from bs4 import BeautifulSoup

def normalize_text(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())

def build_playable_nations():
    base_dir = os.path.dirname(__file__)
    achievements_path = os.path.join(base_dir, '..', 'public', 'achievements.json')
    countries_html_path = os.path.join(base_dir, 'wiki_pages', 'countries', 'Countries.html')
    
    if not os.path.exists(achievements_path) or not os.path.exists(countries_html_path):
        print("HATA: Gerekli JSON veya HTML dosyaları bulunamadı.")
        return

    with open(achievements_path, 'r', encoding='utf-8') as f:
        all_achievements = json.load(f)
    
    valid_ach_names = {normalize_text(a["name"]): a["name"] for a in all_achievements}

    with open(countries_html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    playable_countries = []

    for table in soup.find_all('table', class_='wikitable'):
        for row in table.find_all('tr')[1:]:
            cols = row.find_all(['td', 'th'])
            if len(cols) < 5: continue
            
            country_name = cols[1].text.strip()
            notes = cols[4].text.strip().lower()

            if notes == "" or "exists in 1444" in notes:
                country_achs = set()
                
                safe_name = country_name.lower().replace(' ', '_').replace('/', '_').replace("'", "")
                country_file = os.path.join(base_dir, 'wiki_pages', 'countries', f"{safe_name}.html")
                
                if os.path.exists(country_file):
                    with open(country_file, 'r', encoding='utf-8') as cf:
                        csoup = BeautifulSoup(cf.read(), 'html.parser')
                        
                        # DÜZELTME BURADA: 'chievement' yerine sadece 'chieve' arıyoruz ve küçük harfe çeviriyoruz
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

                playable_countries.append({
                    "country": country_name,
                    "achievements": list(country_achs)
                })

    output_path = os.path.join(base_dir, '..', 'public', 'playable_countries.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(playable_countries, f, indent=4, ensure_ascii=False)
        
    print(f"BAŞARILI: Gotland dahil {len(playable_countries)} ülkenin başarımları eşleştirildi!")

if __name__ == "__main__":
    build_playable_nations()