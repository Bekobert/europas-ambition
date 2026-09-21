import os
import json
from bs4 import BeautifulSoup

def parse_all_achievements():
    base_dir = os.path.dirname(__file__)
    # Dosya yolunu kendi sistemine göre kontrol et
    achievements_file = os.path.join(base_dir, 'wiki_pages/mechanics/Achievements.html')
    
    if not os.path.exists(achievements_file):
        print("HATA: Achievements.html bulunamadı.")
        return

    with open(achievements_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    achievements = []
    table = soup.find('table', class_='mildtable')
    
    if not table:
        print("HATA: Başarımlar tablosu bulunamadı.")
        return

    rows = table.find_all('tr')[1:]
    
    for row in rows:
        cols = row.find_all(['th', 'td'])
        if len(cols) < 5: continue
        
        try:
            name_div = cols[0].find('div', style=lambda s: s and 'font-weight: bold' in s)
            name = name_div.text.strip() if name_div else "Unknown"
            
            desc_div = cols[0].find('div', style=lambda s: s and 'font-style: italic' in s)
            description = desc_div.text.strip() if desc_div else ""
            
            img_tag = cols[0].find('img')
            icon_url = "https://eu4.paradoxwikis.com" + img_tag['src'] if img_tag and 'src' in img_tag.attrs else ""
            
            difficulty = cols[6].text.strip() if len(cols) >= 7 else "Unknown"
            
            # FİLTREYİ KALDIRDIK: Artık ülkesi olsun olmasın tüm başarımlar listeye ekleniyor.
            achievements.append({
                "id": name.lower().replace(" ", "_").replace("'", ""),
                "name": name,
                "description": description,
                "icon_url": icon_url,
                "difficulty": difficulty
            })
        except Exception as e:
            continue

    public_dir = os.path.join(base_dir, '..', 'public')
    os.makedirs(public_dir, exist_ok=True)
    
    output_path = os.path.join(public_dir, 'achievements.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(achievements, f, indent=4, ensure_ascii=False)
        
    print(f"BAŞARILI: Toplam {len(achievements)} başarım (oyundaki tüm başarımlar) achievements.json dosyasına yazıldı!")

if __name__ == "__main__":
    parse_all_achievements()