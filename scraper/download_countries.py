import os
import time
import cloudscraper
from bs4 import BeautifulSoup

def download_country_pages():
    base_url = "https://eu4.paradoxwikis.com"
    countries_url = f"{base_url}/Countries"
    
    # Standart requests yerine Cloudflare engelini aşan scraper'ı başlatıyoruz
    scraper = cloudscraper.create_scraper(browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    })
    
    output_dir = os.path.join(os.path.dirname(__file__), 'wiki_pages')
    os.makedirs(output_dir, exist_ok=True)
    
    print("Adım 1: Ana ülkeler listesi alınıyor (Cloudflare bypass ediliyor)...")
    try:
        response = scraper.get(countries_url)
        response.raise_for_status()
    except Exception as e:
        print(f"Bağlantı hatası: {e}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    country_links = {}
    
    tables = soup.find_all('table')
    
    for table in tables:
        for row in table.find_all('tr'):
            cols = row.find_all(['td', 'th'])
            if not cols: continue
            
            first_col = cols[0]
            for a_tag in first_col.find_all('a'):
                href = a_tag.get('href', '')
                title = a_tag.get('title', '')
                
                if href.startswith('/') and ':' not in title and title != '':
                    country_links[title] = base_url + href
                    break
                        
    print(f"\nToplam {len(country_links)} benzersiz sayfa bulundu.")
    
    if len(country_links) == 0:
        print("HATA: Hâlâ ülke bulunamadı. HTML yapısı incelenmeli.")
        return
        
    print("İndirme operasyonu başlıyor...\n")
    
    count = 1
    total = len(country_links)
    
    for country_name, link in country_links.items():
        safe_name = country_name.lower().replace(' ', '_').replace('/', '_').replace("'", "")
        file_path = os.path.join(output_dir, f"{safe_name}.html")
        
        if os.path.exists(file_path):
            print(f"[{count}/{total}] Atlanıyor (Zaten mevcut): {country_name}")
            count += 1
            continue
            
        print(f"[{count}/{total}] İndiriliyor: {country_name}...")
        
        try:
            page_response = scraper.get(link, timeout=15)
            page_response.raise_for_status()
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(page_response.text)
        except Exception as e:
            print(f"HATA - {country_name} indirilemedi: {e}")
            
        # cloudscraper kullandığımız için bekleme süresini 1 saniyeye düşürebiliriz
        time.sleep(1)
        count += 1
        
    print("\nOPERASYON TAMAMLANDI!")

if __name__ == "__main__":
    download_country_pages()