import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Redefining language switchers strictly to root paths as requested
    replaced1, count1 = re.subn(r'<a href="/ru/[^"]*" (class="lang-btn(?: active)?")>RU</a>', r'<a href="/ru/" \1>RU</a>', content)
    replaced2, count2 = re.subn(r'<a href="/en/[^"]*" (class="lang-btn(?: active)?")>EN</a>', r'<a href="/en/" \1>EN</a>', replaced1)
    
    if count1 > 0 or count2 > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(replaced2)

root_en = '/Users/lyazzatkalymbetova/Agentic/infolady.online/en'
root_ru = '/Users/lyazzatkalymbetova/Agentic/infolady.online/ru'

for root, _, files in os.walk(root_en):
    for file in files:
        if file.endswith('.html'):
            process_file(os.path.join(root, file))

for root, _, files in os.walk(root_ru):
    for file in files:
        if file.endswith('.html'):
            process_file(os.path.join(root, file))

print("Language switcher URLs have been successfully locked to strictly /ru/ and /en/ root paths.")
