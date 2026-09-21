import os
import time
import cloudscraper
from bs4 import BeautifulSoup
from urllib.parse import unquote

def download_hybrid_wiki():
    base_url = "https://eu4.paradoxwikis.com"
    
    # Sadece kendisini indireceğimiz devasa "Ansiklopedi" sayfaları
    encyclopedia_targets = {
        "ideas_and_policies": ["/Idea_groups", "/Policies"],
        "military": ["/Land_warfare", "/Naval_warfare", "/Army", "/Navy", "/Discipline", "/Siege"],
        # Başarımlar sayfasını da sitemiz için buraya ekledik!
        "mechanics": ["/Modifiers", "/Economy", "/Trade", "/Technology", "/Institutions", "/Achievements"]
    }
    
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True})
    base_output_dir = os.path.join(os.path.dirname(__file__), 'wiki_pages')

    print("Hibrit Veri Toplayıcı Başlatılıyor...\n")

    # === 1. BÖLÜM: ÜLKELERİ (SUB-PAGES) İNDİR ===
    print("=== BÖLÜM 1: ÜLKELER ===")
    countries_dir = os.path.join(base_output_dir, "countries")
    os.makedirs(countries_dir, exist_ok=True)
    
    try:
        resp = scraper.get(f"{base_url}/Countries")
        soup = BeautifulSoup(resp.text, 'html.parser')
        country_links = {}
        
        # Sadece doğru tabloyu bul ve gerçek ülkeleri topla
        for table in soup.find_all('table'):
            headers = [th.text.strip().lower() for th in table.find_all('th')]
            if 'country' in headers and 'tag' in headers:
                for row in table.find_all('tr'):
                    cols = row.find_all('td')
                    if not cols: continue
                    for a_tag in cols[1].find_all('a'):
                        href = a_tag.get('href', '')
                        title = a_tag.get('title', '')
                        if href.startswith('/') and title and not title.startswith(('File:', 'Template:', 'Category:')):
                            country_links[title] = base_url + href
                            break
        
        print(f"{len(country_links)} Ülke bulundu. İndiriliyor...")
        count = 1
        for name, link in country_links.items():
            safe_name = name.lower().replace(' ', '_').replace('/', '_').replace("'", "")
            file_path = os.path.join(countries_dir, f"{safe_name}.html")
            if not os.path.exists(file_path):
                print(f"  [{count}/{len(country_links)}] İndiriliyor: {name}")
                page_resp = scraper.get(link, timeout=15)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(page_resp.text)
                time.sleep(1) # Ban yememek için 1 saniye bekle
            else:
                print(f"  [{count}/{len(country_links)}] Atlanıyor (Var): {name}")
            count += 1
    except Exception as e:
        print(f"Ülkeler indirilirken hata: {e}")

    # === 2. BÖLÜM: MEKANİKLERİ (HUB-PAGES) İNDİR ===
    print("\n=== BÖLÜM 2: MEKANİKLER VE İDEALAR ===")
    for category, urls in encyclopedia_targets.items():
        cat_dir = os.path.join(base_output_dir, category)
        os.makedirs(cat_dir, exist_ok=True)
        
        for url in urls:
            safe_name = unquote(url.lstrip('/')).replace(' ', '_')
            file_path = os.path.join(cat_dir, f"{safe_name}.html")
            
            if not os.path.exists(file_path):
                print(f"  İndiriliyor: {safe_name} ({category})")
                try:
                    resp = scraper.get(base_url + url, timeout=15)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(resp.text)
                    time.sleep(1)
                except Exception as e:
                    print(f"Hata ({safe_name}): {e}")
            else:
                print(f"  Atlanıyor (Var): {safe_name}")

    print("\nVERİTABANI OLUŞTURMA TAMAMLANDI!")

if __name__ == "__main__":
    download_hybrid_wiki()