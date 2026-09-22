import os
import re
import json

def fill_coordinates():
    base_dir = os.path.dirname(__file__)
    public_dir = os.path.join(base_dir, '..', 'public')
    
    json_path = os.path.join(public_dir, 'playable_countries.json')
    positions_file = os.path.join(public_dir, 'positions.txt')
    countries_dir = os.path.join(public_dir, 'countries')

    if not all(os.path.exists(p) for p in [json_path, positions_file, countries_dir]):
        print("HATA: JSON, positions.txt veya countries klasörü bulunamadı.")
        return

    # 1. positions.txt'den tüm eyalet koordinatlarını al
    province_coords = {}
    with open(positions_file, 'r', encoding='latin-1') as f:
        matches = re.finditer(r"(\d+)\s*=\s*\{.*?position\s*=\s*\{\s*([\d\.]+)\s+([\d\.]+)", f.read(), re.DOTALL)
        for match in matches:
            province_coords[match.group(1)] = (float(match.group(2)), float(match.group(3)))

    # 2. Oyun dosyalarından TAG -> Capital ID eşleşmesini bul
    tag_to_capital = {}
    for filename in os.listdir(countries_dir):
        if filename.endswith(".txt") and "-" in filename:
            tag = filename.split('-')[0].strip()
            with open(os.path.join(countries_dir, filename), 'r', encoding='latin-1') as f:
                cap_match = re.search(r"capital\s*=\s*(\d+)", f.read())
                if cap_match:
                    tag_to_capital[tag] = cap_match.group(1)

    # 3. Mevcut JSON'ı oku
    with open(json_path, 'r', encoding='utf-8') as f:
        countries_data = json.load(f)

    MAP_WIDTH, MAP_HEIGHT = 5632.0, 2048.0
    updated_count = 0

    # 4. JSON içinde dön ve eksikleri tamamla
    for country in countries_data:
        tag = country.get("tag")
        
        # Eğer kullanıcının girdiği geçerli bir tag varsa ve koordinat objesi yoksa:
        if tag and tag != "UNKNOWN" and "coordinates" not in country:
            capital_id = tag_to_capital.get(tag)
            
            if capital_id and capital_id in province_coords:
                x, y = province_coords[capital_id]
                country["coordinates"] = {
                    "top": f"{((MAP_HEIGHT - y) / MAP_HEIGHT) * 100:.2f}%",
                    "left": f"{(x / MAP_WIDTH) * 100:.2f}%"
                }
                updated_count += 1
            else:
                print(f"UYARI: '{tag}' TAG'ı için başkent veya koordinat bilgisi oyun dosyalarında bulunamadı.")

    # 5. Güncellenmiş veriyi aynı JSON dosyasına geri yaz
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(countries_data, f, indent=4, ensure_ascii=False)
        
    print(f"İŞLEM TAMAM! Toplam {updated_count} ülkeye koordinat bilgisi başarıyla eklendi.")

if __name__ == "__main__":
    fill_coordinates()