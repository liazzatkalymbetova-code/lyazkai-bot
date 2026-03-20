import os

root_dir = '/Users/lyazzatkalymbetova/Agentic/infolady.online'
sitemap_path = os.path.join(root_dir, 'sitemap.xml')

base_url = "https://infolady.online"

xml_head = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
'''
xml_foot = '</urlset>'

urls = []
# Root index
urls.append(f"{base_url}/")

# Walk en and ru
def collect_urls(dir_name):
    target = os.path.join(root_dir, dir_name)
    for filename in sorted(os.listdir(target)):
        if filename.endswith('.html'):
            if filename == 'index.html':
                 urls.append(f"{base_url}/{dir_name}/")
            else:
                 urls.append(f"{base_url}/{dir_name}/{filename}")

collect_urls('en')
collect_urls('ru')

with open(sitemap_path, 'w', encoding='utf-8') as f:
    f.write(xml_head)
    for u in sorted(urls):
        f.write(f"  <url>\n    <loc>{u}</loc>\n  </url>\n")
    f.write(xml_foot)

print(f"Generated new sitemap with {len(urls)} links.")
