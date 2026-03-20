import os
import shutil
import re

root_dir = '/Users/lyazzatkalymbetova/Agentic/infolady.online'
en_dir = os.path.join(root_dir, 'en')
ru_dir = os.path.join(root_dir, 'ru')
backup_dir = os.path.join(root_dir, 'backup_before_restructure')

# Make sure full backup is created!
print("Creating backup...")
if os.path.exists(backup_dir):
    shutil.rmtree(backup_dir)
os.makedirs(backup_dir)

# Backup everything except .git and the backup folder and seo-backend
for item in os.listdir(root_dir):
    if item in ['.git', 'backup_before_restructure', 'seo-backend', 'node_modules']:
        continue
    src = os.path.join(root_dir, item)
    dst = os.path.join(backup_dir, item)
    if os.path.isdir(src):
        shutil.copytree(src, dst)
    else:
        shutil.copy2(src, dst)
print("Backup created.")

if not os.path.exists(en_dir):
    os.makedirs(en_dir)
if not os.path.exists(ru_dir):
    os.makedirs(ru_dir)

en_files = {} # filename -> filepath of original
ru_files = {} # filename -> filepath of original

# Phase 1: Scan and map files
for dirpath, dirnames, filenames in os.walk(root_dir):
    rel_dirpath = os.path.relpath(dirpath, root_dir)
    
    # We want to ignore these directories:
    # Notice we split the relative directories to explicitly search for exact folder matches
    parts = rel_dirpath.split(os.sep)
    if any(ignore in parts for ignore in ['seo-backend', '.git', 'backup_before_restructure', 'node_modules', 'ru', 'en']):
        continue
        
    for filename in filenames:
        if filename.endswith('.html'):
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            if rel_path == 'index.html':
                 en_files['index.html'] = filepath
                 continue
                 
            # Note: since we excluded 'ru' and 'en' dirs from this walk,
            # this walk only finds root and the other dirs (scan, platform, etc).
            if filename.endswith('-ru.html'):
                base_name = filename.replace('-ru.html', '.html')
                ru_files[base_name] = filepath
            else:
                en_files[filename] = filepath

# Also walk 'ru' dir to collect the already moved russian files
for dirpath, dirnames, filenames in os.walk(ru_dir):
    for filename in filenames:
        if filename.endswith('.html'):
            filepath = os.path.join(dirpath, filename)
            ru_files[filename] = filepath

print(f"Mapped {len(en_files)} EN files and {len(ru_files)} RU files.")

# Phase 2: Copy files to their new home and process them
def process_html(html, lang, filename):
    # 1. Update HTML lang
    html = re.sub(r'<html lang="[^"]+">', f'<html lang="{lang}">', html)
    
    # 2. Update Language Switcher
    lang_btn_ru = f'<a href="/ru/{filename if filename != "index.html" else ""}" class="lang-btn{" active" if lang=="ru" else ""}">RU</a>'
    lang_btn_en = f'<a href="/en/{filename if filename != "index.html" else ""}" class="lang-btn{" active" if lang=="en" else ""}">EN</a>'
    
    # Replace old buttons
    html = re.sub(r'<button class="lang-btn.*?" data-lang="ru">RU</button>', lang_btn_ru, html)
    html = re.sub(r'<button class="lang-btn.*?" data-lang="en">EN</button>', lang_btn_en, html)
    
    # 3. Handle Canonical and Hreflang
    canonical_filename = filename if filename != "index.html" else ""
    hreflang_block = f"""<link rel="canonical" href="https://infolady.online/{lang}/{canonical_filename}">
    <!-- Multilingual SEO -->
    <link rel="alternate" hreflang="en" href="https://infolady.online/en/{canonical_filename}" />
    <link rel="alternate" hreflang="ru" href="https://infolady.online/ru/{canonical_filename}" />
    <link rel="alternate" hreflang="x-default" href="https://infolady.online/" />"""

    # We want to replace the whole block from canonical to the last alternate tag
    html = re.sub(r'<link rel="canonical" href="[^"]*">.*?<link rel="alternate" hreflang="x-default" href="[^"]*" />', hreflang_block, html, flags=re.DOTALL)
    
    # If the regex didn't find the old block (maybe missing x-default), let's fallback replacement:
    if "<!-- Multilingual SEO -->" not in html:
        # Try to insert after <head> or replace just canonical
        html = re.sub(r'<link rel="canonical" href="[^"]*">', hreflang_block, html)

    # 4. Update internal links
    # Convert href="/scan/something.html#hash" to href="/lang/something.html#hash"
    def repl_link(m):
        full_path = m.group(1) # e.g. /scan/something.html#pricing
        target_filename = m.group(2) # something.html
        suffix = m.group(3) or '' # #pricing
        
        if target_filename == "index.html":
             return f'href="/{lang}/{suffix}"'
        return f'href="/{lang}/{target_filename}{suffix}"'

    # Match href="/some/path/file.html#hash"
    html = re.sub(r'href="(/(?:[^"]+/)?([^"/#?]+\.html)([#?][^"]*)?)"', repl_link, html)
    
    # Also handle href="file.html#hash" (relative)
    def repl_relative(m):
        target_filename = m.group(1)
        suffix = m.group(2) or ''
        if target_filename == "index.html":
            return f'href="/{lang}/{suffix}"'
        return f'href="/{lang}/{target_filename}{suffix}"'
    
    html = re.sub(r'href="([^"/#?]+\.html)([#?][^"]*)?"', repl_relative, html)
    
    # Update platform script linking
    html = html.replace('src="/platform/dashboard-app.js"', 'src="/dashboard-app.js"')
    
    return html

# Write out English files
for filename, src in en_files.items():
    with open(src, 'r', encoding='utf-8') as f:
         html = f.read()
    html = process_html(html, 'en', filename)
    dst = os.path.join(en_dir, filename)
    with open(dst, 'w', encoding='utf-8') as f:
         f.write(html)

# Write out Russian files
for filename, src in ru_files.items():
    with open(src, 'r', encoding='utf-8') as f:
         html = f.read()
    html = process_html(html, 'ru', filename)
    dst = os.path.join(ru_dir, filename)
    with open(dst, 'w', encoding='utf-8') as f:
         f.write(html)

# Also ensure dashboard-app.js is at root
if os.path.exists(os.path.join(root_dir, 'platform', 'dashboard-app.js')):
    shutil.copy2(os.path.join(root_dir, 'platform', 'dashboard-app.js'), os.path.join(root_dir, 'dashboard-app.js'))

print("All HTML files processed and placed in /en/ and /ru/ !")

# Phase 3: We can safely delete the old folders to enforce the strict architecture
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
