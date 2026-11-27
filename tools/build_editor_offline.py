#!/usr/bin/env python3
"""Build a standalone offline editor (no JSON fetch required)."""
from pathlib import Path
import json, re, base64

root=Path(__file__).resolve().parent.parent
html=(root/'editor/index.html').read_text('utf-8')
style=(root/'editor/style.css').read_text('utf-8')
script=(root/'editor/app.js').read_text('utf-8')
i18n=json.loads((root/'data/i18n.json').read_text('utf-8'))
i18n_json=json.dumps(i18n,ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c').replace('>',r'\u003e').replace('&',r'\u0026')
i18n_js=(root/'assets/i18n.js').read_text('utf-8')
html=html.replace('<script src="../assets/i18n.js" data-locales="../data/i18n.json"></script>','<script id="embeddedI18n" type="application/json">'+i18n_json+'</script>\n<script>'+i18n_js+'</script>')
assert 'src="../assets/i18n.js"' not in html
weeks={p.stem:json.loads(p.read_text('utf-8')) for p in sorted((root/'data/weeks').glob('20*.json'))}
teachers=json.loads((root/'data/teachers.json').read_text('utf-8'))
room_patterns=json.loads((root/'data/room-patterns.json').read_text('utf-8'))
subjects=json.loads((root/'data/subjects.json').read_text('utf-8'))
data=json.dumps({'weeks':weeks,'teachers':teachers,'roomPatterns':room_patterns,'subjects':subjects},ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c').replace('>',r'\u003e').replace('&',r'\u0026')
logo='data:image/svg+xml;base64,'+base64.b64encode((root/'assets/raspissanie-mark.svg').read_bytes()).decode('ascii')
theme_style=(root/'assets/themes.css').read_text('utf-8')
theme_script=(root/'assets/themes.js').read_text('utf-8')
html=html.replace('<link rel="stylesheet" href="../assets/themes.css">','')
html=html.replace('<script defer src="../assets/themes.js"></script>','<script>\n'+theme_script+'\n</script>')
html=html.replace('<link rel="stylesheet" href="./style.css">', '')
html=html.replace('<script defer src="../assets/pwa.js"></script>', '')
html=html.replace('<link rel="manifest" href="../manifest.webmanifest">', '')
html=re.sub(r'^\s*<link[^>]+(?:apple-touch-icon|favicon-48)[^>]*>\s*$', '', html, flags=re.M)
html=html.replace('</head>',f'<style>\n{style}\n</style>\n<style>\n{theme_style}\n</style>\n</head>')
html=html.replace('src="../assets/raspissanie-mark.svg"',f'src="{logo}"')
html=html.replace('<a href="../index.html">← К расписанию курсантов</a>', '<span>Автономный режим редактора</span>')
html=html.replace('<a href="../data/weeks/manifest.json" target="_blank" rel="noopener">Посмотреть манифест</a>', 'Список недель можно скачать кнопкой «Скачать manifest».')
html=html.replace('<script src="./app.js"></script>',f'<script type="application/json" id="embeddedEditorData">{data}</script>\n<script>\n{script}\n</script>')
output=root/'editor-offline.html'
output.write_text(html,'utf-8')
print(output,output.stat().st_size)
