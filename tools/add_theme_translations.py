#!/usr/bin/env python3
"""Shared appearance labels for all 28 interface languages."""
from pathlib import Path
import json
p=Path(__file__).resolve().parent.parent/'data/i18n.json'
d=json.loads(p.read_text('utf-8'))
keys=['Тема','Стандартная','Синяя','Розовенькая','Гламур','Санкт-Петербург','ЛСД','Матрица','Ночная кабина','Тетрадка','Ультрафиолет','Простая','Девяностые']
# The new palette labels do not change historical course names or any timetable JSON.
labels={
'ru':['Тема','Стандартная','Синяя','Розовенькая','Гламур','Санкт-Петербург','ЛСД','Матрица','Ночная кабина','Тетрадка','Ультрафиолет','Простая','Девяностые'],
'en':['Theme','Standard','Blue','Pink','Glamour','Saint Petersburg','LSD','Matrix','Night cockpit','Notebook','Ultraviolet','Plain','The Nineties'],
'de':['Design','Standard','Blau','Rosarot','Glamour','Sankt Petersburg','LSD','Matrix','Nachtcockpit','Schulheft','Ultraviolett','Einfach','Neunziger'],
'fr':['Thème','Classique','Bleu','Rose','Glamour','Saint-Pétersbourg','LSD','Matrix','Cockpit de nuit','Cahier','Ultraviolet','Simple','Années 90'],
'it':['Tema','Standard','Blu','Rosa','Glamour','San Pietroburgo','LSD','Matrix','Cabina notturna','Quaderno','Ultravioletto','Semplice','Anni Novanta'],
'es':['Tema','Estándar','Azul','Rosa','Glamur','San Petersburgo','LSD','Matrix','Cabina nocturna','Cuaderno','Ultravioleta','Sencillo','Los noventa'],
'pt':['Tema','Padrão','Azul','Rosa','Glamour','São Petersburgo','LSD','Matrix','Cabine noturna','Caderno','Ultravioleta','Simples','Anos 90'],
'pl':['Motyw','Standardowy','Niebieski','Różowy','Glamour','Petersburg','LSD','Matrix','Nocny kokpit','Zeszyt','Ultrafiolet','Prosty','Lata 90.'],
'cs':['Motiv','Výchozí','Modrý','Růžový','Glamour','Petrohrad','LSD','Matrix','Noční kokpit','Sešit','Ultrafialový','Jednoduchý','Devadesátky'],
'sv':['Tema','Standard','Blå','Rosa','Glamour','Sankt Petersburg','LSD','Matrix','Nattcockpit','Skrivhäfte','Ultraviolett','Enkel','Nittiotalet'],
'da':['Tema','Standard','Blå','Lyserød','Glamour','Sankt Petersborg','LSD','Matrix','Natcockpit','Notesbog','Ultraviolet','Enkel','Halvfemserne'],
'no':['Tema','Standard','Blå','Rosa','Glamour','St. Petersburg','LSD','Matrix','Nattcockpit','Notatbok','Ultrafiolett','Enkel','Nittitallet'],
'fi':['Teema','Tavallinen','Sininen','Vaaleanpunainen','Glamour','Pietari','LSD','Matrix','Yöohjaamo','Vihko','Ultravioletti','Yksinkertainen','Yhdeksänkymmentäluku'],
'et':['Teema','Tavaline','Sinine','Roosa','Glamuur','Peterburi','LSD','Matrix','Öine kokpit','Vihik','Ultraviolett','Lihtne','Üheksakümnendad'],
'lv':['Tēma','Standarta','Zila','Rozā','Glamūrs','Sanktpēterburga','LSD','Matrica','Nakts kabīne','Burtnīca','Ultravioletā','Vienkārša','Deviņdesmitie'],
'lt':['Tema','Standartinė','Mėlyna','Rožinė','Glamūras','Sankt Peterburgas','LSD','Matrica','Naktinė kabina','Sąsiuvinis','Ultravioletinė','Paprasta','Devyniasdešimtieji'],
'hu':['Téma','Alap','Kék','Rózsaszín','Glamúr','Szentpétervár','LSD','Mátrix','Éjszakai pilótafülke','Füzet','Ultraibolya','Egyszerű','Kilencvenes évek'],
'el':['Θέμα','Βασικό','Μπλε','Ροζ','Γκλάμουρ','Αγία Πετρούπολη','LSD','Μάτριξ','Νυχτερινό πιλοτήριο','Τετράδιο','Υπεριώδες','Απλό','Δεκαετία του 90'],
'ja':['テーマ','標準','青','ピンク','グラマー','サンクトペテルブルク','LSD','マトリックス','夜のコックピット','ノート','紫外線','シンプル','90年代'],
'ko-S':['테마','기본','파랑','분홍','글래머','상트페테르부르크','LSD','매트릭스','야간 조종석','공책','자외선','간단','90년대'],
'ko-N':['주제','기본','파랑','분홍','화려함','쌍뜨뻬쩨르부르그','LSD','매트릭스','야간 조종실','학습장','자외선','단순','1990년대'],
'eo':['Etoso','Norma','Blua','Rozkolora','Glamuro','Sankt-Peterburgo','LSD','Matrico','Nokta pilotejo','Kajero','Ultraviola','Simpla','Naŭdekaj'],
'la':['Species','Solita','Caerulea','Rosea','Splendor','Petropolis','LSD','Matrix','Cabina nocturna','Quaternio','Ultraviolacea','Simplex','Anni nonagesimi'],
'isv':['Tema','Standardna','Modra','Rozova','Glamur','Sankt-Peterburg','LSD','Matrica','Nočna kabina','Zapisnik','Ultrafiolet','Prosta','Devędesete'],
'bxr':['Загбар','Юрын','Хүхэ','Ягаан','Гламур','Санкт-Петербург','ЛСД','Матрица','Һүниин кабина','Дэбтэр','Ультрафиолет','Энгын','Ерээд онууд'],
'ns84':['Темпо','Нормпо','Синпо','Розпо','Глампо','Питерпо','ЛСД','Матрипо','Ночекаб','Тетрпо','Ультрафпо','Простпо','90по'],
'tok':['nasin kule','nasin pi tenpo ale','laso','loje walo','kule pona mute','ma tomo Pita','LSD','Matrix','tomo tawa pi tenpo pimeja','lipu sona','kule pi suno nasa','nasin lili','tenpo sike 1990'],
'tlh':['Hovmey','motlh','SuD','Doq','batlh','Sankt Petersburg','LSD','Matrix','qaStaHvIS ram Duj','paq','SuDqu’','ngeD','DISmey 90']
}
assert set(labels)==set(d['translations']), (set(d['translations'])-set(labels),set(labels)-set(d['translations']))
for lang,arr in labels.items():
 assert len(arr)==len(keys)
 for key,value in zip(keys,arr): d['translations'][lang]['ui'][key]=value
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Added theme labels to',len(labels),'languages')
