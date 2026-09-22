import os
import re
import json

def generate_coordinates():
    base_dir = os.path.dirname(__file__)
    public_dir = os.path.join(base_dir, '..', 'public')
    
    positions_file = os.path.join(public_dir, 'positions.txt')
    countries_dir = os.path.join(public_dir, 'countries')

    if not os.path.exists(positions_file) or not os.path.exists(countries_dir):
        print("HATA: public klasöründe 'positions.txt' veya 'countries' klasörü eksik.")
        return

    print("1. positions.txt okunuyor...")
    province_coords = {}
    with open(positions_file, 'r', encoding='latin-1') as f:
        matches = re.finditer(r"(\d+)\s*=\s*\{.*?position\s*=\s*\{\s*([\d\.]+)\s+([\d\.]+)", f.read(), re.DOTALL)
        for match in matches:
            province_coords[match.group(1)] = (float(match.group(2)), float(match.group(3)))

    print("2. Ülke isimleri ve başkentler countries dosyalarından çekiliyor...")
    final_coordinates = {}
    MAP_WIDTH, MAP_HEIGHT = 5632.0, 2048.0

    for filename in os.listdir(countries_dir):
        if filename.endswith(".txt") and "-" in filename:
            try:
                # "TUR - Ottomans.txt" formatından "Ottomans" ismini ayıkla
                country_name = filename.split('-')[1].replace('.txt', '').strip()
                
                with open(os.path.join(countries_dir, filename), 'r', encoding='latin-1') as f:
                    cap_match = re.search(r"capital\s*=\s*(\d+)", f.read())
                    if cap_match:
                        capital_id = cap_match.group(1)
                        if capital_id in province_coords:
                            x, y = province_coords[capital_id]
                            final_coordinates[country_name] = {
                                "top": f"{((MAP_HEIGHT - y) / MAP_HEIGHT) * 100:.2f}%",
                                "left": f"{(x / MAP_WIDTH) * 100:.2f}%"
                            }
            except Exception as e: 
                continue

    output_path = os.path.join(public_dir, 'coordinates.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_coordinates, f, indent=4, ensure_ascii=False)
        
    print(f"BAŞARILI! {len(final_coordinates)} ülkenin koordinatı public/coordinates.json dosyasına yazıldı.")

if __name__ == "__main__":
    generate_coordinates()