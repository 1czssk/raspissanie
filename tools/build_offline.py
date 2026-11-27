#!/usr/bin/env python3
"""Собирает автономный offline.html из index.html и JSON-справочников."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent.parent
weeks={}
for p in sorted((ROOT/'data'/'weeks').glob('20??-??-??.json')):
    weeks[p.stem]=json.loads(p.read_text(encoding='utf-8'))
manifest=json.loads((ROOT/'data'/'weeks'/'manifest.json').read_text(encoding='utf-8'))
teachers=json.loads((ROOT/'data'/'teachers.json').read_text(encoding='utf-8'))
subjects=json.loads((ROOT/'data'/'subjects.json').read_text(encoding='utf-8'))
bundle=json.dumps({'manifest':manifest,'teachers':teachers,'subjects':subjects,'weeks':weeks},ensure_ascii=False,separators=(',',':'))
bundle=bundle.replace('<',r'\u003c').replace('>',r'\u003e').replace('&',r'\u0026')
src=(ROOT/'index.html').read_text(encoding='utf-8')
i18n=json.loads((ROOT/'data/i18n.json').read_text('utf-8'))
i18n_json=json.dumps(i18n,ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c').replace('>',r'\u003e').replace('&',r'\u0026')
i18n_js=(ROOT/'assets/i18n.js').read_text(encoding='utf-8')
src=src.replace('<script src="./assets/i18n.js" data-locales="./data/i18n.json"></script>','<script id="embeddedI18n" type="application/json">'+i18n_json+'</script>\n<script>'+i18n_js+'</script>')
assert 'src="./assets/i18n.js"' not in src
# An offline HTML file must not request an external image.
import re, base64
img=(ROOT/'assets'/'raspissanie-mark.svg').read_bytes()
# Standalone mode includes the entire theme engine, without network requests.
theme_style=(ROOT/'assets/themes.css').read_text('utf-8')
theme_script=(ROOT/'assets/themes.js').read_text('utf-8')
src=src.replace('  <link rel="stylesheet" href="./assets/themes.css" />', '')
src=src.replace('  <script defer src="./assets/themes.js"></script>','<script>\n'+theme_script+'\n</script>')
src=src.replace('</style>\n</head>','</style>\n<style>\n'+theme_style+'\n</style>\n</head>',1)
src=src.replace('  <script defer src="./assets/pwa.js"></script>', '')
src=src.replace('  <link rel="manifest" href="./manifest.webmanifest" />', '')
src=re.sub(r'^\s*<link[^>]+(?:apple-touch-icon|favicon-48)[^>]*>\s*$', '', src, flags=re.M)
src=src.replace('./assets/raspissanie-mark.svg','data:image/svg+xml;base64,'+base64.b64encode(img).decode('ascii'))
assert src.count('  <script>')==1
src=src.replace('  <script>','  <script id="embeddedArchive" type="application/json">'+bundle+'</script>\n  <script>',1)
(ROOT/'offline.html').write_text(src,encoding='utf-8')
print('Created offline.html with',len(weeks),'weeks and',len(teachers['teachers']),'teachers')
