import os
import shutil
import re

root_dir = '/Users/lyazzatkalymbetova/Agentic/infolady.online'
en_dir = os.path.join(root_dir, 'en')
ru_dir = os.path.join(root_dir, 'ru')
backup_dir = os.path.join(root_dir, 'backup_before_restructure')

# Step 0: Ensure backup is safe
if not os.path.exists(backup_dir):
    print("Error: Backup dir missing. Run from a safe state.")
    exit(1)

if not os.path.exists(en_dir):
    os.makedirs(en_dir)
if not os.path.exists(ru_dir):
    os.makedirs(ru_dir)

# Mapping rel_path to absolute src
en_files = {} 
ru_files = {}

# We only process HTML files. We will keep their exact rel_path inside en/ and ru/
for dirpath, dirnames, filenames in os.walk(root_dir):
    rel_dirpath = os.path.relpath(dirpath, root_dir)
    parts = rel_dirpath.split(os.sep)
    
    # We ignore these directories from scanning
    if any(ignore in parts for ignore in ['seo-backend', '.git', 'backup_before_restructure', 'node_modules', 'ru', 'en']):
        continue
        
    for filename in filenames:
        if filename.endswith('.html'):
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            if rel_path == 'index.html':
                 en_files['index.html'] = filepath
                 continue
                 
            if filename.endswith('-ru.html'):
                # it's a russian file
                base_rel_path = rel_path.replace('-ru.html', '.html')
                ru_files[base_rel_path] = filepath
            else:
                en_files[rel_path] = filepath

# Also get already nested russian files in `ru/` 
for dirpath, dirnames, filenames in os.walk(os.path.join(root_dir, 'backup_before_restructure', 'ru')):
    for filename in filenames:
        if filename.endswith('.html'):
            filepath = os.path.join(dirpath, filename)
            # Find the true rel_path by searching en_files
            true_rel = None
            possible_matches = []
            for en_rel in en_files.keys():
                if os.path.basename(en_rel) == filename:
                    possible_matches.append(en_rel)
            
            if possible_matches:
                # Prioritize deeper paths (more slashes)
                possible_matches.sort(key=lambda x: str(x).count('/'), reverse=True)
                true_rel = possible_matches[0]
            
            if true_rel:
                ru_files[true_rel] = filepath
            else:
                # If no english match, just keep it flat
                ru_files[filename] = filepath

print(f"Mapped {len(en_files)} EN files and {len(ru_files)} RU files (preserving nesting).")

def process_html(html, lang, rel_path):
    # Rel_path is e.g. "platform/about.html" or "index.html"
    # We want absolute links from root like /en/platform/about.html
    # target_uri represents the path from the root url without the lang prefix
    target_uri = rel_path.replace('\\', '/')
    
    # 1. Update HTML lang
    html = re.sub(r'<html lang="[^"]+">', f'<html lang="{lang}">', html)
    
    # 2. Language Switcher Buttons
    # Old logic: <button class="lang-btn..." data-lang="ru">RU</button>
    # We need to map them to /ru/platform/about.html and /en/platform/about.html
    
    if target_uri == "index.html":
        uri_path = ""
    else:
        uri_path = target_uri

    lang_btn_ru = f'<a href="/ru/{uri_path}" class="lang-btn{" active" if lang=="ru" else ""}">RU</a>'
    lang_btn_en = f'<a href="/en/{uri_path}" class="lang-btn{" active" if lang=="en" else ""}">EN</a>'
    
    html = re.sub(r'<button class="lang-btn.*?" data-lang="ru">RU</button>', lang_btn_ru, html)
    html = re.sub(r'<button class="lang-btn.*?" data-lang="en">EN</button>', lang_btn_en, html)
    
    # Also handle previous a tags
    html = re.sub(r'<a href="[^"]*" class="lang-btn(?: active)?">RU</a>', lang_btn_ru, html)
    html = re.sub(r'<a href="[^"]*" class="lang-btn(?: active)?">EN</a>', lang_btn_en, html)

    # 3. Canonical and Hreflang
    hreflang_block = f"""<link rel="canonical" href="https://infolady.online/{lang}/{uri_path}">
    <!-- Multilingual SEO -->
    <link rel="alternate" hreflang="en" href="https://infolady.online/en/{uri_path}" />
    <link rel="alternate" hreflang="ru" href="https://infolady.online/ru/{uri_path}" />
    <link rel="alternate" hreflang="x-default" href="https://infolady.online/" />"""

    html = re.sub(r'<link rel="canonical" href="[^"]*">.*?<link rel="alternate" hreflang="x-default" href="[^"]*" />', hreflang_block, html, flags=re.DOTALL)
    if "<!-- Multilingual SEO -->" not in html:
        html = re.sub(r'<link rel="canonical" href="[^"]*">', hreflang_block, html)

    # 4. Update Internal Links
    # Any href="/platform/about.html" -> href="/lang/platform/about.html"
    # Any href="/scan/something.html" -> href="/lang/scan/something.html"
    # Match href="/something" (but ignore already /en/ or /ru/ or extensions like .css, .png, .js)
    
    def repl_href(m):
        full_match = m.group(0) # href="/platform/about.html"
        inner_path = m.group(1) # /platform/about.html
        
        # Don't touch external or assets
        if inner_path.startswith(('http', 'mailto', 'tel', '#', '//')): return full_match
        if any(inner_path.endswith(ext) for ext in ['.css', '.png', '.jpg', '.svg', '.js', '.ico', '.json']): return full_match
        if inner_path.startswith('/en/') or inner_path.startswith('/ru/'): return full_match
        
        # Only rewrite absolute internal links. Leave relative alone.
        if not inner_path.startswith('/'):
            return full_match
            
        # Special case for index
        if inner_path == '/' or inner_path == '/index.html':
            return f'href="/{lang}/"'
        
        # It's an internal link absolute path like /platform/about.html
        # remove leading slash
        clean_path = inner_path.lstrip('/')
        
        return f'href="/{lang}/{clean_path}"'

    html = re.sub(r'href="([^"]+)"', repl_href, html)

    # Update platform script linking if previously modified
    html = html.replace('src="/platform/dashboard-app.js"', 'src="/dashboard-app.js"')
    # Or relative
    html = html.replace('src="../platform/dashboard-app.js"', 'src="/dashboard-app.js"')
    
    return html

# Write out files matching the nested path structure
for rel_path, src in en_files.items():
    with open(src, 'r', encoding='utf-8') as f:
         html = f.read()
    html = process_html(html, 'en', rel_path)
    
    dst = os.path.join(en_dir, rel_path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'w', encoding='utf-8') as f:
         f.write(html)

for rel_path, src in ru_files.items():
    with open(src, 'r', encoding='utf-8') as f:
         html = f.read()
    html = process_html(html, 'ru', rel_path)
    
    dst = os.path.join(ru_dir, rel_path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'w', encoding='utf-8') as f:
         f.write(html)

print("All HTML files processed and cleanly nested in /en/ and /ru/ !")

# Phase 3: We can safely delete the old folders now
folders_to_delete = ['scan', 'audit', 'tools', 'platform', 'analytics']
for folder in folders_to_delete:
    tgt = os.path.join(root_dir, folder)
    if os.path.exists(tgt):
        shutil.rmtree(tgt)
        print(f"Removed legacy folder: {folder}")

# Delete loose HTML files from root (except index.html)
for item in os.listdir(root_dir):
    if item.endswith('.html') and item != 'index.html':
        os.remove(os.path.join(root_dir, item))

print("Cleanup complete.")
