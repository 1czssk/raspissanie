#!/usr/bin/env python3
"""Обновляет названия предметов и создаёт справочник связей «предмет — преподаватель — кабинет».

Команда: python3 tools/build_subjects.py
Псевдонимы исходных сокращений сохраняются для импорта. Исторические данные
нормализуются, но номера аудиторий, даты и преподаватели не меняются.
"""
from collections import Counter, defaultdict
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parent.parent
WDIR = ROOT/'data'/'weeks'
ALIAS_TO_CANONICAL = {
    'Аварийно-спасательное оборудование ВС': 'Аварийно-спасательное оборудование воздушного судна',
    'Воздушное право РФ': 'Воздушное право Российской Федерации',
    'Двигатель с-та Cessna-172S': 'Двигатель самолёта Cessna-172S',
    'Иностранный язык в проф. деятельности': 'Иностранный язык в профессиональной деятельности',
    'Лётная эксплуатация многодвигательного ВС': 'Лётная эксплуатация многодвигательного воздушного судна',
    'Лётно-технические характеристики ВС': 'Лётно-технические характеристики воздушных судов',
    'Метрология, С.С.': 'Метрология, стандартизация и сертификация',
    'Общий курс беспилотных транспортных систем': 'Общий курс беспилотных авиационных систем',
    'Подготовка авиа/персонала в области Ч/Ф': 'Подготовка авиационного персонала в области человеческого фактора',
    'Правовое обеспечение проф. деятельности': 'Правовое обеспечение профессиональной деятельности',
    'Практическая а/дин-ка многодвигательного ВС': 'Практическая аэродинамика многодвигательного воздушного судна',
    'Приборное оборудование ВС': 'Приборное оборудование воздушных судов',
    'Приборное оборудование многодвигательного ВС': 'Приборное оборудование многодвигательного воздушного судна',
    'Приборное оборудование однодвигательного ВС': 'Приборное оборудование однодвигательного воздушного судна',
    'Радиотехническое оборудование ВС': 'Радиотехническое оборудование воздушных судов',
    'Радиотехническое оборудование м/д ВС': 'Радиотехническое оборудование многодвигательного воздушного судна',
    'Радиотехническое оборудование м/л ВС': 'Радиотехническое оборудование многодвигательного воздушного судна',
    'Самолёт многодвигательный и его системы': 'Многодвигательный самолёт и его системы',
    'Самолёт однодвигательный и его системы': 'Однодвигательный самолёт и его системы',
    'Силовые установки ВС': 'Силовые установки воздушных судов',
    'Силовые установки многодвигательного ВС': 'Силовые установки многодвигательного воздушного судна',
    'УВД': 'Управление воздушным движением',
    'Физо': 'Физическая подготовка',
}
# Stable slugs, independent of future language/display-name updates.
FIXED_SLUGS = {
  'Аварийно-спасательная подготовка':'emergency-rescue-training',
  'Аварийно-спасательное оборудование воздушного судна':'aircraft-emergency-equipment',
  'Авиационная безопасность':'aviation-security',
  'Аэродинамика и динамика полёта':'aerodynamics-flight-dynamics',
  'Безопасность жизнедеятельности':'life-safety',
  'Безопасность полётов':'flight-safety',
  'Воздушная навигация':'air-navigation',
  'Воздушное право':'aviation-law',
  'Воздушное право Российской Федерации':'russian-aviation-law',
  'Двигатель самолёта Cessna-172S':'cessna-172s-engine',
  'Инженерная графика':'engineering-drawing',
  'Иностранный язык':'foreign-language',
  'Иностранный язык в профессиональной деятельности':'professional-foreign-language',
  'Лётная эксплуатация многодвигательного воздушного судна':'multiengine-aircraft-operation',
  'Лётно-технические характеристики воздушных судов':'aircraft-performance',
  'Математика':'mathematics',
  'Метрология, стандартизация и сертификация':'metrology-standardization-certification',
  'Общий курс беспилотных авиационных систем':'unmanned-aircraft-systems',
  'Основы экономики':'economics-fundamentals',
  'Охрана труда':'occupational-safety',
  'Подготовка авиационного персонала в области человеческого фактора':'aviation-human-factors',
  'Правила полётов по приборам':'instrument-flight-rules',
  'Правовое обеспечение профессиональной деятельности':'professional-legal-support',
  'Практическая аэродинамика многодвигательного воздушного судна':'multiengine-practical-aerodynamics',
  'Приборное оборудование воздушных судов':'aircraft-instruments',
  'Приборное оборудование многодвигательного воздушного судна':'multiengine-aircraft-instruments',
  'Приборное оборудование однодвигательного воздушного судна':'singleengine-aircraft-instruments',
  'Радиотехническое оборудование воздушных судов':'aircraft-radio-equipment',
  'Радиотехническое оборудование многодвигательного воздушного судна':'multiengine-aircraft-radio',
  'Ресурсы отрасли':'industry-resources',
  'Многодвигательный самолёт и его системы':'multiengine-aircraft-systems',
  'Однодвигательный самолёт и его системы':'singleengine-aircraft-systems',
  'Силовые установки воздушных судов':'aircraft-powerplants',
  'Силовые установки многодвигательного воздушного судна':'multiengine-aircraft-powerplants',
  'Техническая механика':'technical-mechanics',
  'Управление воздушным движением':'air-traffic-control',
  'Физическая подготовка':'physical-training',
  'Электротехника и электроника':'electrical-engineering-electronics',
}
# Backward-compatible aliases: useful for importing older JSON/XLSX and text documents.
canonical_aliases = defaultdict(set)
for alias, name in ALIAS_TO_CANONICAL.items():
    canonical_aliases[name].add(alias)
canonical_aliases['Общий курс беспилотных авиационных систем'].add('Общий курс беспилотных транспортных систем')

# Source may include a new subject beyond the original templates: don't invent its meaning.
TRANS = str.maketrans({'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'})
def canon(subject):
    return ALIAS_TO_CANONICAL.get(subject.strip(),subject.strip())
def subid(subject):
    s=FIXED_SLUGS.get(subject)
    if not s:s=re.sub(r'[^a-z0-9]+','-',subject.lower().translate(TRANS)).strip('-')
    return 'subject-'+s

teachers=json.loads((ROOT/'data'/'teachers.json').read_text('utf-8'))['teachers']
teacher_by_id={t['id']:t for t in teachers}
records=defaultdict(lambda:{'lessons':0,'rooms':Counter(),'teachers':defaultdict(lambda:{'lessons':0,'rooms':Counter(),'weeks':set()}),'weeks':set()})
files=sorted(WDIR.glob('20??-??-??.json'))
for file in files:
    data=json.loads(file.read_text('utf-8'))
    for group in data.get('groups',{}).values():
        for date,day in group['days'].items():
            for l in day['lessons']:
                if l.get('kind')=='self_study':
                    l['subject']='Самоподготовка'
                    l['subjectId']='activity-self-study'
                    l.pop('subjectIds',None)
                    continue
                variants=l.get('variants') or [l]
                ids=[]
                for v in variants:
                    old=str(v.get('subject') or '').strip()
                    new=canon(old)
                    if old!=new:canonical_aliases[new].add(old)
                    v['subject']=new
                    sid=subid(new)
                    v['subjectId']=sid
                    ids.append(sid)
                    rec=records[new]
                    rec['lessons']+=1;rec['weeks'].add(data['weekStart'])
                    tch=v.get('teacherId') or None
                    room=str(v.get('room') or '').strip()
                    if room:rec['rooms'][room]+=1
                    if tch:
                        tr=rec['teachers'][tch]
                        tr['lessons']+=1;tr['weeks'].add(data['weekStart'])
                        if room:tr['rooms'][room]+=1
                if l.get('kind')=='split':
                    l['subject']= ' / '.join(v['subject'] for v in variants)
                    l['subjectIds']=ids
                    l.pop('subjectId',None)
                else:
                    l['subjectId']=ids[0]
                    l.pop('subjectIds',None)
    file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')

subject_items=[]
for name in sorted(records,key=lambda s:s.casefold()):
    r=records[name]
    teacher_items=[]
    for tid,tr in r['teachers'].items():
        counts=tr['rooms'];top=counts.most_common(1)
        preferred=top[0][0] if top and top[0][1]>=2 and top[0][1]/max(1,sum(counts.values()))>=.8 else None
        teacher_items.append({
            'teacherId':tid,'teacherName':teacher_by_id.get(tid,{}).get('displayName',tid),
            'lessonCount':tr['lessons'],'weeks':sorted(tr['weeks']),
            'rooms':dict(sorted(counts.items())),'usualRoom':preferred,
        })
    teacher_items.sort(key=lambda t:(-t['lessonCount'],t['teacherName'].casefold()))
    item={
        'id':subid(name),'name':name,
        'aliases':sorted(canonical_aliases[name],key=str.casefold),
        'lessonCount':r['lessons'],'weeks':sorted(r['weeks']),
        'rooms':dict(sorted(r['rooms'].items())),
        'teachers':teacher_items,
    }
    if name=='Общий курс беспилотных авиационных систем':
        item['needsConfirmation']=True
        item['note']='В расписании встречались «авиационных» и «транспортных» систем; объединены предварительно по уточнению пользователя.'
    subject_items.append(item)

out={'schemaVersion':1,'basedOnWeeks':[p.stem for p in files],
     'method':'Рекомендации основаны на наблюдениях из опубликованных недель. Преподаватели и аудитории не закреплены жёстко.',
     'subjects':subject_items,
     'activities':[{'id':'activity-self-study','name':'Самоподготовка','aliases':['с/п']}],
}
(ROOT/'data'/'subjects.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Предметов:',len(subject_items),'преподавателей:',len(teacher_by_id),'пар занятий:',sum(r['lessons'] for r in records.values()))
for e in subject_items:
    if e['aliases']:print(e['name'],'←',', '.join(e['aliases']))
