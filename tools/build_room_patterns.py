#!/usr/bin/env python3
"""Обновить справочник привычных аудиторий из опубликованных JSON-недель.

Использование: python3 tools/build_room_patterns.py
После обновления запусти tools/build_editor_offline.py для автономного редактора.

Справочник основан только на архивных JSON-файлах, а не на локальных
черновиках пользователей. Аномальная аудитория — предупреждение, не ошибка.
"""
from pathlib import Path
from collections import Counter, defaultdict
import json

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
WEEKS = DATA / 'weeks'

by_teacher = defaultdict(lambda: defaultdict(list))
by_subject = defaultdict(lambda: defaultdict(list))
files = sorted(WEEKS.glob('20??-??-??.json'))

for path in files:
    week = json.loads(path.read_text(encoding='utf-8'))
    for group, group_info in week.get('groups', {}).items():
        for date, day in group_info.get('days', {}).items():
            for lesson in day.get('lessons', []):
                if lesson.get('kind') == 'self_study':
                    continue
                for entry in (lesson.get('variants') or [lesson]):
                    teacher_id = entry.get('teacherId')
                    subject = str(entry.get('subject') or '').strip()
                    room = str(entry.get('room') or '').strip()
                    if not teacher_id or not subject or not room:
                        continue
                    observation = {
                        'week': week['weekStart'], 'date': date,
                        'group': group, 'slot': lesson['number'], 'room': room
                    }
                    by_teacher[teacher_id][room].append(observation)
                    by_subject[(teacher_id, subject)][room].append(observation)


def summarize(rooms):
    counts = Counter({room: len(items) for room, items in rooms.items()})
    most_common_room, count = counts.most_common(1)[0]
    total = sum(counts.values())
    weeks = sorted({item['week'] for room_items in rooms.values() for item in room_items})
    reliable = len(weeks) >= 2 and total >= 3
    predominant = reliable and count / total >= .85
    consistent = predominant and len(counts) == 1
    return {
        'rooms': dict(sorted(counts.items())),
        'weeks': weeks,
        'count': total,
        'preferredRoom': most_common_room if predominant else None,
        'basis': 'consistent' if consistent else ('predominant' if predominant else None),
    }

teachers = {tid: summarize(rooms) for tid, rooms in by_teacher.items()}
pairs = [
    {'teacherId': tid, 'subject': subject, **summarize(rooms)}
    for (tid, subject), rooms in by_subject.items()
]
pairs.sort(key=lambda item: (item['teacherId'], item['subject'].lower()))

exceptions = []
for (tid, subject), rooms in by_subject.items():
    baseline = summarize(rooms)
    if baseline['basis'] != 'predominant':
        continue
    for room, events in rooms.items():
        if room == baseline['preferredRoom']:
            continue
        for event in events:
            exceptions.append({
                'teacherId': tid, 'subject': subject,
                'usualRoom': baseline['preferredRoom'], **event,
            })
exceptions.sort(key=lambda event: (event['date'], event['group'], event['slot']))

patterns = {
    'schemaVersion': 1,
    'basedOnWeeks': [path.stem for path in files],
    'method': 'Аудитория считается обычной, если подтверждена двумя неделями и минимум 85% занятий. Это подсказка, а не обязательное правило.',
    'teachers': dict(sorted(teachers.items())),
    'teacherSubjects': pairs,
    'exceptions': exceptions,
}
output = DATA / 'room-patterns.json'
output.write_text(json.dumps(patterns, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Обновлено: {len(teachers)} преподавателей, {len(pairs)} связок, {len(exceptions)} исключений')
