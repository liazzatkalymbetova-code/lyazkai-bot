import os
import re

target_dir = '/Users/lyazzatkalymbetova/Agentic/infolady.online/ru'

count = 0
for root, _, files in os.walk(target_dir):
    for filename in files:
        if filename.endswith('.html'):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # replace variants of ₸/ай with ₸/месяц
            new_content = re.sub(r'₸\s*/\s*ай', '₸/месяц', content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
                print(f"Updated {filepath}")

print(f"Total files updated: {count}")
