import os
import shutil

root_dir = '/Users/lyazzatkalymbetova/Agentic/infolady.online'
en_dir = os.path.join(root_dir, 'en')
ru_dir = os.path.join(root_dir, 'ru')
backup_dir = os.path.join(root_dir, 'backup_before_restructure')

# 1. Create backup to be extremely safe, we won't actually move yet, just print plan
print("Creating backup...")
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)
# Not full backup for now, we'll just test the mapping

en_files = {} # target_name -> source_path
ru_files = {} # target_name -> source_path

for dirpath, dirnames, filenames in os.walk(root_dir):
    # ignore backend and git
    if 'seo-backend' in dirpath or '.git' in dirpath or 'backup' in dirpath:
        continue
        
    for filename in filenames:
        if filename.endswith('.html'):
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            # Root index.html stays at root
            if rel_path == 'index.html':
                continue
                
            # Classify as Russian or English
            is_ru = False
            base_name = filename
            
            if rel_path.startswith('ru/'):
                is_ru = True
            elif filename.endswith('-ru.html'):
                is_ru = True
                base_name = filename.replace('-ru.html', '.html')
                
            if is_ru:
                # If it's already in ru_files, compare
                if base_name in ru_files:
                    # Keep the one that's already in the 'ru' directory preferably
                    if rel_path.startswith('ru/'):
                        ru_files[base_name] = filepath
                else:
                    ru_files[base_name] = filepath
            else:
                if base_name in en_files:
                    # Keep the one that is at root preferably, or in subdirs
                    if '/' not in rel_path:
                        en_files[base_name] = filepath
                else:
                    en_files[base_name] = filepath

print(f"Discovered {len(en_files)} English files and {len(ru_files)} Russian files.")

# Check for mismatches
en_only = set(en_files.keys()) - set(ru_files.keys())
ru_only = set(ru_files.keys()) - set(en_files.keys())

print(f"English only: {en_only}")
print(f"Russian only: {ru_only}")

with open('mapping_plan.txt', 'w') as f:
    f.write("ENGLISH MAPPING:\n")
    for name, path in en_files.items():
        f.write(f"/en/{name}  <--  {path}\n")
    f.write("\nRUSSIAN MAPPING:\n")
    for name, path in ru_files.items():
        f.write(f"/ru/{name}  <--  {path}\n")
