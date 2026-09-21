import requests

url = "https://eu4.paradoxwikis.com/Countries"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

response = requests.get(url, headers=headers)

with open("debug_page.html", "w", encoding="utf-8") as f:
    f.write(response.text)

print("Sayfa HTML'i 'debug_page.html' dosyasına kaydedildi. Lütfen bu dosyayı tarayıcınızda açıp bakın.")