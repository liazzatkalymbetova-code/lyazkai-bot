import os
import re

root_dir = '/Users/lyazzatkalymbetova/Agentic/infolady.online'

def scan_links(folder):
    target = os.path.join(root_dir, folder)
    for root, _, files in os.walk(target):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find all href="<url>"
                hrefs = re.findall(r'href="([^"]+)"', content)
                for href in hrefs:
                    if href.startswith('/') and not href.startswith(f'/{folder}/') and not href.startswith('/en/') and not href.startswith('/ru/') and not href.endswith('.css') and not href.endswith('.png') and not href.endswith('.svg') and not href.endswith('.ico'):
                        print(f"[{folder}] Found invalid absolute root link in {os.path.relpath(path, root_dir)}: {href}")

scan_links('ru')
scan_links('en')
