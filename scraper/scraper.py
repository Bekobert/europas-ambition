import json
import os
from bs4 import BeautifulSoup

def parse_local_wiki():
    html_file = os.path.join(os.path.dirname(__file__), 'ach_wiki.html')
    
    if not os.path.exists(html_file):
        print(f"Hata: '{html_file}' bulunamadı!")
        return

    print("Yerel ach_wiki.html okunuyor. Tamamen dinamik analiz başlatıldı...")
    
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    achievements = []
    
    # Doğru tabloyu bul
    target_table = None
    for table in soup.find_all('table'):
        headers = [th.text.strip().lower() for th in table.find_all(['th', 'td'])]
        if any('achievement' in h for h in headers) and any('starting conditions' in h for h in headers):
            target_table = table
            break

    if not target_table:
        print("Tablo bulunamadı.")
        return

    rows = target_table.find_all('tr')[1:]
    
    for row in rows:
        cols = row.find_all('td')
        if len(cols) < 4: 
            continue
            
        try:
            # 1. Temel Bilgileri Çek
            first_col = cols[0]
            name_div = first_col.find('div', style=lambda value: value and 'font-weight: bold' in value)
            name = name_div.text.strip() if name_div else first_col.text.strip().split('\n')[0]
            ach_id = name.lower().replace(" ", "_").replace("'", "").replace("’", "").replace("?", "").replace("!", "")

            desc_div = first_col.find('div', style=lambda value: value and 'font-style: italic' in value)
            description = desc_div.text.strip() if desc_div else ""

            img_tag = first_col.find('img')
            icon_url = ""
            if img_tag and 'src' in img_tag.attrs:
                raw_src = img_tag['src']
                icon_url = raw_src[1:] if raw_src.startswith("./") else ("/" + raw_src if not raw_src.startswith("http") else raw_src)

            difficulty = cols[-1].text.strip() if len(cols) >= 6 else "Unknown"
            
            # 2. Tamamen Dinamik Algoritma: Jenerikleri Dışla, Tüm Olası Ülkeleri Bağla
            assigned_countries = set()
            
            # Sadece Başlangıç, Tamamlama ve Notlar sütunlarını tarıyoruz (cols[1], cols[2], cols[3])
            scan_cols = cols[1:4] 
            
            for col in scan_cols:
                # Paradox wiki'sindeki ülke bayraklarının değişmez belirteci: class="thumbborder"
                flags = col.find_all('img', class_='thumbborder')
                for flag in flags:
                    alt_text = flag.get('alt', '')
                    # Örn: alt="Flag of Castile" -> Sadece "Castile" kısmını al
                    if alt_text.startswith('Flag of '):
                        country_name = alt_text.replace('Flag of ', '').strip()
                        assigned_countries.add(country_name)
            
            # EĞER SATIRDA HİÇ ÜLKE BAYRAĞI YOKSA -> JENERİK BAŞARIMDIR, ATLA!
            if len(assigned_countries) == 0:
                continue
            
            # Bulunan tüm ilgili ülkeler için başarımları çoğalt (Zar havuzu için)
            for country in assigned_countries:
                achievements.append({
                    "id": f"{ach_id}_{country.lower().replace(' ', '_')}", # React'te key çakışmasını engeller
                    "name": name,
                    "description": description,
                    "starting_country": country,
                    "icon_url": icon_url,
                    "difficulty": difficulty
                })

        except Exception as e:
            continue

    public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
    os.makedirs(public_dir, exist_ok=True)
    
    output_path = os.path.join(public_dir, 'achievements.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(achievements, f, indent=4, ensure_ascii=False)
        
    print(f"BAŞARILI! Dinamik algoritma çalıştı.")
    print(f"Jenerik başarımlar dışlandı. Toplam {len(achievements)} ülke-başarım eşleşmesi oluşturuldu.")

if __name__ == "__main__":
    parse_local_wiki()