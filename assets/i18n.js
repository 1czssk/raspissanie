/* Расписсание: интерфейсные переводы, названия дисциплин и транслитерация.
   Русский — единственный канонический язык в расписаниях JSON.
   Смена языка не записывает переводы в учебные данные. */
(()=>{'use strict';
const KEY='raspissanie-language-v1';
let language='ru', bundle=null, teacherList=[], observer=null, busy=false;
const textSources=new WeakMap(), attributeSources=new WeakMap();
const FALLBACK={'ru':'Русский','en':'Английский'};
try{language=localStorage.getItem(KEY)||'ru'}catch(_){language='ru'}
const DEFAULTS=[["ru","Русский","ru-RU"],["en","Английский / English","en-GB"],["bxr","Бурятский","bxr-RU"],["hu","Венгерский / Magyar","hu-HU"],["el","Греческий / Ελληνικά","el-GR"],["da","Датский / Dansk","da-DK"],["es","Испанский / Español","es-ES"],["it","Итальянский / Italiano","it-IT"],["tlh","Клингонский / tlhIngan Hol","tlh"],["ko-N","Корейский (северный) / 조선말","ko-KP"],["ko-S","Корейский (южный) / 한국어","ko-KR"],["la","Латынь / Latina","la"],["lv","Латышский / Latviešu","lv-LV"],["lt","Литовский / Lietuvių","lt-LT"],["isv","Межславянский / Medžuslovjansky","isv"],["de","Немецкий / Deutsch","de-DE"],["ns84","Новояз (1984)","ru-RU"],["no","Норвежский / Norsk","nb-NO"],["pl","Польский / Polski","pl-PL"],["pt","Португальский / Português","pt-PT"],["tok","Токи пона / toki pona","en-GB"],["fi","Финский / Suomi","fi-FI"],["fr","Французский / Français","fr-FR"],["cs","Чешский / Čeština","cs-CZ"],["sv","Шведский / Svenska","sv-SE"],["eo","Эсперанто / Esperanto","en-GB"],["et","Эстонский / Eesti","et-EE"],["ja","Японский / 日本語","ja-JP"]];
const LOCALE=Object.fromEntries(DEFAULTS.map(l=>[l[0],l[2]]));
const RU_LETTER={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
const JP_NAMES=['アヌフリエフ','バタグラリエワ','ブラジニコワ','ヴォロジコ','ダニロワ','ジダノワ','カプスチャン','キセリョフ','リファリ','ペレシコ','ポンクラショフ','プシェニチニコフ','レベノク','サルティコワ','ソトニコフ','チジョフ','シロツキー','ヤクニン'];
const KO_NAMES=['아누프리예프','바타그랄리예바','브라즈니코바','볼로디코','다닐로바','즈다노바','카푸스탼','키셀료프','리파리','펠레시코','폰크라쇼프','프셰니치니코프','레베노크','살티코바','소트니코프','치조프','시로츠키','야쿠닌'];
const GR_NAMES=['Ανούφριεφ','Μπαταγκραλίεβα','Μπράζνικοβα','Βολοντκό','Ντανίλοβα','Ζντάνοβα','Καπουστιάν','Κισελιόφ','Λιφάρ','Πελέσκο','Πονκρασιόφ','Πσενίτσνικοφ','Ρεμπιόνοκ','Σαλτίκοβα','Σότνικοφ','Τσιζόφ','Σιρότσκι','Γιακούνιν'];
const TEACHER_ORDER=['Ануфриев','Батагралиева','Бражникова','Володько','Данилова','Жданова','Капустян','Киселёв','Лифарь','Пелешко','Понкрашёв','Пшеничников','Ребенок','Салтыкова','Сотников','Чижов','Широцкий','Якунин'];
const NAMES_BY_SCRIPT={'ja':JP_NAMES,'ko-S':KO_NAMES,'ko-N':KO_NAMES,'el':GR_NAMES};
const BRAND='Расписсание';
const getDict=()=>bundle?.translations?.[language]||null;
const getU=()=>getDict()?.ui||{};
const getSubjects=()=>getDict()?.subjects||{};
function roman(s){return Array.from(s).map(c=>{const t=RU_LETTER[c.toLocaleLowerCase('ru')];return t===undefined?c:(c===c.toUpperCase()?t.charAt(0).toUpperCase()+t.slice(1):t)}).join('')}

const CUSTOM_DATE={
 'isv':{months:['januar','februar','marec','april','maj','junij','julij','avgust','septembr','oktobr','novembr','decembr'],days:['nedělja','ponedělok','vtornik','srěda','četvrtok','petok','subota']},
 'la':{months:['Ianuarii','Februarii','Martii','Aprilis','Maii','Iunii','Iulii','Augusti','Septembris','Octobris','Novembris','Decembris'],days:['dies Solis','dies Lunae','dies Martis','dies Mercurii','dies Iovis','dies Veneris','dies Saturni']},
 'bxr':{months:['январиин','февралиин','мартын','апрелиин','майн','июниин','июлиин','августын','сентябриин','октябриин','ноябриин','декабриин'],days:['Ням','Дабаа','Мягмар','Лхагва','Пүрбэ','Баасан','Бямба']},
 'ns84':{months:['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','нояб','дек'],days:['вск','пнд','вт','ср','чт','пт','сб']},
 // Klingon has no established Gregorian month names; numbers are intentional.
 'tlh':{months:['jar 1','jar 2','jar 3','jar 4','jar 5','jar 6','jar 7','jar 8','jar 9','jar 10','jar 11','jar 12'],days:['jaj 7','jaj 1','jaj 2','jaj 3','jaj 4','jaj 5','jaj 6']}
};
function currentLocale(){return LOCALE[language]||'ru-RU'}
function date(iso,opt={day:'numeric',month:'long'}){
 if(!iso)return '';
 const custom=CUSTOM_DATE[language];
 if(custom){const d=new Date(iso+'T12:00:00Z');if(Number.isNaN(d.getTime()))return iso;
   if(opt.weekday&&!opt.day&&!opt.month)return custom.days[d.getUTCDay()];
   if(opt.day&&opt.month)return (language==='tlh'?custom.months[d.getUTCMonth()]+' · '+d.getUTCDate():d.getUTCDate()+' '+custom.months[d.getUTCMonth()]);
 }
 try{return new Intl.DateTimeFormat(currentLocale(),{...opt,timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'))}catch(_){return new Intl.DateTimeFormat('en-GB',{...opt,timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'))}
}
function week(num){if(language==='ru')return num+'-я учебная неделя';
 const q={'en':'Academic week','de':'Unterrichtswoche','fr':'Semaine de cours','es':'Semana lectiva','it':'Settimana didattica','pt':'Semana letiva','pl':'Tydzień nauki','cs':'Výukový týden','eo':'Studsemajno','da':'Undervisningsuge','no':'Undervisningsuke','fi':'Opetusviikko','et':'Õppenädal','lv':'Mācību nedēļa','lt':'Mokymosi savaitė','hu':'Tanulmányi hét','el':'Εβδομάδα μαθημάτων','ja':'授業週','sv':'Undervisningsvecka','ko-S':'수업 주','ko-N':'수업 주','tok':'tenpo pi kama sona','isv':'Učebna sedmica','la':'Hebdomas studiorum','bxr':'Һуралсалай долоон хоног','ns84':'Учнед','tlh':'ghojmeH Hogh'};
 return (['ja','ko-S','ko-N'].includes(language)?'':'')+(q[language]||q.en)+' '+num;
}
function count(n,key){if(language==='ru'){
   const fmt=(o,f,m)=>n%100>=11&&n%100<=14?m:n%10===1?o:n%10>=2&&n%10<=4?f:m;
   if(key==='lessons')return n+' '+fmt('занятие','занятия','занятий');
   if(key==='self')return n+' '+fmt('блок самоподготовки','блока самоподготовки','блоков самоподготовки');
   if(key==='groups')return n+' '+fmt('загруженная группа','загруженные группы','загруженных групп');
 }
 const nouns={
 'en':['class','self-study block','groups loaded'],'de':['Stunden','Selbststudiumsblöcke','geladene Gruppen'],
 'fr':['cours','blocs de travail personnel','groupes chargés'],'es':['clases','bloques de estudio autónomo','grupos cargados'],
 'it':['lezioni','blocchi di studio individuale','gruppi caricati'],'pt':['aulas','blocos de estudo autónomo','grupos carregados'],
 'pl':['zajęć','bloków samodzielnej nauki','załadowanych grup'],'cs':['hodin','bloků samostudia','načtených skupin'],
 'da':['lektioner','selvstudieblokke','indlæste grupper'],'sv':['lektioner','självstudiepass','inlästa grupper'],'no':['timer','egenstudieblokker','lastede grupper'],
 'fi':['oppituntia','itseopiskelujaksoa','ladattua ryhmää'],'et':['tundi','iseseisva õppe blokki','laaditud rühma'],
 'lv':['nodarbības','patstāvīgā darba bloki','ielādētas grupas'],'lt':['pamokos','savarankiško mokymosi blokai','įkeltos grupės'],
 'hu':['óra','önálló tanulási blokk','betöltött csoport'],'el':['μαθήματα','ενότητες αυτομελέτης','φορτωμένες ομάδες'],
 'ja':['授業','自習枠','読込済みグループ'],'ko-S':['수업','자율 학습','불러온 그룹'],'ko-N':['수업','자습','불러온 조'],
 'eo':['lecionoj','blokojn de memlernado','ŝarĝitaj grupoj'],'tok':['tenpo sona','tenpo pi kama sona','kulupu li lon'],
 'isv':['lekcije','bloki samostojnogo učenja','grupy'],
 'la':['lectiones','partes studii privati','greges'],
 'bxr':['хэшээл','бэеэ даагаад һуралсаха үе','бүлэг'],
 'ns84':['занпо','сампо','группо'],
 'tlh':['ghojmeH mIwmey','nIteb ghojmeH poH','ghommey']
 };
 let a=nouns[language]||nouns.en;return n+' '+a[key==='lessons'?0:key==='self'?1:2];
}
function teacherLabel(t){if(!t)return '—';let item=typeof t==='string'?teacherList.find(x=>x.id===t||x.surname===t||x.displayName===t||x.aliases?.includes(t)):t;
 const orig=item?item.displayName||item.surname:String(t);
 if(['ru','bxr','ns84'].includes(language))return orig;
 const surname=item?.surname||String(orig).match(/^[А-ЯЁ][а-яё-]+/)?.[0]||'';
 if(!surname)return orig;
 const idx=TEACHER_ORDER.indexOf(surname);
 let fam=(NAMES_BY_SCRIPT[language]?.[idx]||roman(surname));
 const suffix=orig.slice(surname.length).trim();
 return fam+(suffix?' '+roman(suffix):'');
}
function registerTeachers(t){teacherList=Array.isArray(t)?t:[];schedule();}
function getSubjectId(value){if(!bundle)return null;const str=String(value||'').trim().toLocaleLowerCase();
 for(const lang of Object.keys(bundle.translations)){
  const subjects=bundle.translations[lang].subjects||{};
  for(const [id,name] of Object.entries(subjects))if(name.toLocaleLowerCase()===str)return id;
 }
 return null;
}
function subject(id,fallback){const translated=getSubjects()[id];if(language==='ru')return fallback||bundle?.translations?.ru?.subjects?.[id]||translated||'';
 return translated||fallback||bundle?.translations?.ru?.subjects?.[id]||'';
}
function canonicalSubject(value){const id=getSubjectId(value);return id?bundle.translations.ru.subjects[id]:value}
const EXACT_EXTRA={
 'ru':{},
 'sv':{
   'Параллельные занятия по подгруппам':'Parallella lektioner i undergrupper',
   'Сохранить локально':'Spara lokalt',
   'Готово к редактированию':'Redo att redigera',
   'Исходный документ / распознанный текст':'Originaldokument / tolkad text',
   'Распознанные записи · можно исправить перед переносом':'Tolkade poster · kan rättas före import',
   'Проверка расписания':'Schemakontroll',
   'Аудитория назначена нескольким группам':'Salen är bokad för flera grupper',
   'Неделя заполнена не полностью':'Veckan är ofullständig',
   'Нет данных':'Inga uppgifter',
   'Новая аудитория':'Ny sal',
   'Новая дисциплина':'Nytt ämne',
   'Фамилия отсутствует в справочнике':'Läraren finns inte i registret',
   'Новый преподаватель по дисциплине':'Ny lärare för ämnet',
   'Аудитория отличается от привычной':'Ovanlig sal',
   'Публикация пока ручная.':'Publiceringen sker tills vidare manuellt.',
   'Редактор не умеет менять публичное расписание на GitHub Pages. Для обновления нужно скачать JSON недели, заменить соответствующий':'Redigeraren kan inte uppdatera GitHub Pages direkt. Ladda ned veckans JSON och ersätt motsvarande fil',
   'в репозитории и, если неделя новая, добавить её в':'i arkivet och lägg till den nya veckan i',
   '. Список недель можно скачать кнопкой «Скачать manifest».':'. Listan över veckor kan laddas ned med knappen Ladda ned manifest.',
   'поддерживается таблица с колонками «Дата / Группа / Пара / Предмет / Преподаватель / Класс», а также экспериментальное чтение широких таблиц по группам.':'Tabeller med Datum / Grupp / Lektion / Ämne / Lärare / Sal stöds, liksom preliminär tolkning av breda tabeller.',
   'извлекается текстовый слой. Скан без текста и фотография остаются источником для ручного переноса — облачное ИИ-распознавание пока не подключено.':'Texten läses ur digitala PDF-filer. Skanningar och foton måste föras in manuellt; molnbaserad AI-tolkning är ännu inte inkopplad.',
   'Сохранено в локальном черновике':'Sparat i lokalt utkast',
   'Предпросмотр':'Förhandsgranskning',
   'Например, воздушная навигация':'Till exempel flygnavigering',
   'Например, Воздушная навигация':'Till exempel Flygnavigering',
   'Например, Капустян':'Till exempel Kapustjan',
   'Например, 41':'Till exempel 41',
   'Занятий не указано':'Inga lektioner angivna',
   'По выбранному преподавателю:':'För vald lärare:',
   'В архиве этот предмет вели:':'Tidigare lärare för ämnet:',
   'Скачать образец CSV для Excel':'Ladda ned exempel-CSV för Excel',
   'Предмет есть в справочнике, но преподаватели пока не подтверждены.':'Ämnet finns i registret, men lärarna är ännu inte bekräftade.',
   'Название курса беспилотных систем объединено предварительно.':'Namnen på kursen om obemannade system har slagits ihop tills vidare.',
   'В справочнике нет такой дисциплины. Можно сохранить новое название.':'Ämnet finns inte i registret. Du kan spara ett nytt namn.',
 },
 'en':{

  'Параллельные занятия по подгруппам':'Parallel subgroup classes',
  'Сохранить локально':'Save locally',
  'Готово к редактированию':'Ready to edit',
  'Исходный документ / распознанный текст':'Original document / recognized text',
  'Распознанные записи · можно исправить перед переносом':'Recognized entries · editable before import',
  'Проверка расписания':'Timetable validation',
  'Аудитория назначена нескольким группам':'Room assigned to multiple groups',
  'Неделя заполнена не полностью':'Incomplete week',
  'Нет данных':'No data',
  'Новая аудитория':'New room',
  'Новая дисциплина':'New subject',
  'Фамилия отсутствует в справочнике':'Teacher not in directory',
  'Новый преподаватель по дисциплине':'New teacher for subject',
  'Аудитория отличается от привычной':'Unusual room',
  'Локальный черновик · без серверной записи':'Local draft · no server changes',
  'Публикация пока ручная.':'Publishing is manual for now.',
  'Редактор не умеет менять публичное расписание на GitHub Pages. Для обновления нужно скачать JSON недели, заменить соответствующий':'The editor cannot update GitHub Pages directly. Download the week JSON and replace the corresponding',
  'в репозитории и, если неделя новая, добавить её в':'in the repository and, for a new week, add it to',
  '. Список недель можно скачать кнопкой «Скачать manifest».':'. You can download the list of weeks with the Download manifest button.',
  'поддерживается таблица с колонками «Дата / Группа / Пара / Предмет / Преподаватель / Класс», а также экспериментальное чтение широких таблиц по группам.':'A table with columns Date / Group / Period / Subject / Teacher / Room is supported, plus experimental parsing of wide tables.',
  'извлекается текстовый слой. Скан без текста и фотография остаются источником для ручного переноса — облачное ИИ-распознавание пока не подключено.':'Text is extracted from digital PDFs. Scans and photos require manual entry; cloud AI recognition is not connected yet.',
  'Проверяем заполнение, занятость и необычные аудитории по двум неделям.':'Checking missing fields, clashes and unusual rooms across two weeks.',
  'Сохранено в локальном черновике':'Saved in local draft',
  'Готово к редактированию':'Ready to edit',
  'Расписсание — любительский проект, сделанный во имя удобства учёбы. Не принимай его близко к сердцу. О проблемах пиши в личку. Конструктивная критика приветствуется.':'is a hobby project made to make studying easier. Don’t take it too seriously. Send me a DM if something goes wrong. Constructive feedback is welcome.',
  '— любительский проект, сделанный во имя удобства учёбы. Не принимай его близко к сердцу. О проблемах пиши в личку. Конструктивная критика приветствуется.':'— a hobby project made to make studying easier. Don’t take it too seriously. Send me a DM if something goes wrong. Constructive feedback is welcome.',
  'Выберите группу, преподавателя или аудиторию для просмотра расписания.':'Choose a group, teacher or room to see the timetable.',
  'Черновик сохраняется в этом браузере':'Your draft is saved in this browser',
  'Создание и импорт недельного расписания с проверкой ошибок':'Create and import weekly timetables with error checks',
  'Нажми на ячейку, чтобы изменить занятие. Справочник подскажет, кто обычно ведёт предмет и где. Подсказки не ограничивают выбор.':'Select a cell to edit a class. The directory suggests usual teachers and rooms; these are only suggestions.',
  'Импорт не публикуется сразу: сначала проверь распознанные строки, затем перенеси их в таблицу.':'Imported records are not published automatically. Review them before adding them to the timetable.',
  'Проверяем заполнение, занятость и необычные аудитории по двум неделям.':'Check missing fields, clashes and unusual rooms using the two archived weeks.',
  'Изменения сохраняются локально. Для публикации скачай JSON и замени файл недели в репозитории GitHub.':'Changes are saved locally. To publish, download the JSON and replace the week file on GitHub.',
  'Публикация пока ручная.':'Publishing is manual for now.',
  'Это любительский проект, сделанный во имя удобства учёбы. Не принимай его близко к сердцу. О проблемах пиши в личку. Конструктивная критика приветствуется.':'This hobby project was made to make studying easier. Don’t take it too seriously. Send me a DM about issues. Constructive feedback is welcome.',
  'Оба занятия проходят одновременно. Выбери преподавателя и аудиторию отдельно для каждой подгруппы.':'Both classes take place at the same time. Choose a separate teacher and room for each subgroup.',
  'Предпросмотр':'Preview', 'Не найдено':'Not found', 'Занятий не указано':'No classes listed',
  'Например, воздушная навигация':'e.g. air navigation','Например, Капустян':'e.g. Kapustyan', 'Например, 41':'e.g. 41',
  'Например, Воздушная навигация':'e.g. Air Navigation','Новая неделя':'New week',
  'Локальный черновик · без серверной записи':'Local draft · no server changes',
  'По выбранному преподавателю:':'For the selected teacher:', 'В архиве этот предмет вели:':'Previously taught by:',
  'Предмет есть в справочнике, но преподаватели пока не подтверждены.':'Subject found; teachers not yet confirmed.',
  'Название курса беспилотных систем объединено предварительно.':'Unmanned aircraft course names have been combined provisionally.',
  'В справочнике нет такой дисциплины. Можно сохранить новое название.':'Subject not found in the directory. You can save a new name.',
  'Скачать образец CSV для Excel':'Download sample CSV for Excel',
  'Документ ещё не выбран.':'No document selected.',
  'Старые недели останутся на месте':'Existing weeks will remain available',
  'При копировании даты переносятся на новую неделю, а старые записи сохраняются. После создания можно исправить занятия вручную.':'Copying shifts lessons to the new week and keeps the older week intact. Edit the new timetable afterward.',
  'Проверяем заполнение, занятость и необычные аудитории по двум неделям.':'Checking completeness, clashes and unusual rooms across two weeks.',
 }
};
// On other languages, use the English translation of secondary descriptions rather than leaving mixed Russian text.
const FALLBACK_EN=EXACT_EXTRA.en;
function localize(raw){if(!raw||language==='ru'||!bundle)return raw;
 if(raw===BRAND)return raw;
 if(getU()[raw])return getU()[raw];
 const ru=getDict()?.subjects||{};
 const id=getSubjectId(raw);
 if(id)return ru[id]||raw;
 let teacher=teacherList.find(x=>x.surname===raw||x.displayName===raw||x.aliases?.includes(raw));if(teacher)return teacherLabel(teacher);
 if(getDict()?.extras?.[raw])return getDict().extras[raw];
 if(EXACT_EXTRA[language]?.[raw])return EXACT_EXTRA[language][raw];
 if(language==='ja'){
   const j={
     '— any —':'— すべて —', 'No data':'データなし',
     'Ready to edit':'編集できます', 'Publishing is manual for now.':'公開は手動で行います。',
     'e.g. air navigation':'例：航空航法', 'e.g. Air Navigation':'例：航空航法',
     'e.g. Kapustyan':'例：カプスチャン', 'e.g. 41':'例：41',
     'No classes listed':'授業が未入力です','No changes':'変更なし',
     'Teacher not in directory':'教員一覧に登録されていません',
     'New subject':'新しい科目','Unusual room':'普段と異なる教室',
     'New room':'新しい教室','New teacher for subject':'この科目の新しい担当教員'
   };
   if(j[raw])return j[raw];
 }
 if(language==='tlh'){
   const t={'No data':"De' tu'lu'be'",'Ready to edit':'choHmeH bIQap',
      'Publishing is manual for now.':'naDev neH yImaq.',
      'No changes':"choHbe'", 'No classes listed':"ghojmeH mIw tu'lu'be'"};
   if(t[raw])return t[raw];
 }
 if(FALLBACK_EN[raw])return FALLBACK_EN[raw];
 const pair=raw.match(/^(\d+)\s+занят(?:ие|ия|ий)$/);if(pair)return count(Number(pair[1]),'lessons');
 const wk=raw.match(/^(\d+)-я учебная неделя$/);if(wk)return week(Number(wk[1]));
 const wkShort=raw.match(/^(\d+)-я неделя/);if(wkShort)return week(Number(wkShort[1]));
 const course=raw.match(/^(\d+) курс$/);if(course)return `${getU()['Курс']||'Year'} ${course[1]}`;
 const branch=raw.match(/^(\d+)-й курс · все 5 групп$/);if(branch)return `${getU()['Курс']||'Year'} ${branch[1]} · ${(getU()['Все группы']||'all groups')}`;
 if(raw==='— любой —')return '— '+({'de':'beliebig','fr':'tous','es':'cualquiera','isv':'ljuby','la':'quivis','bxr':'алишье','ns84':'любой','tlh':'Hoch','ja':'すべて','sv':'valfri'}[language]||'any')+' —';
 if(raw==='Учебная неделя')return getU()['Неделя']||'Week';
 if(raw==='Параллельно · подгруппы')return `${getU()['Подгруппы']||'Subgroups'} · 2`;
 if(raw==='✓ Режим правок включён')return '✓ '+(getU()['Локальные правки']||'Editing enabled');
 if(raw==='✎ Локальные правки')return '✎ '+(getU()['Локальные правки']||'Local edits');
 if(raw==='↓ JSON недели')return '↓ '+(getU()['JSON недели']||'Week JSON');
 if(raw==='⎙ Печать')return '⎙ '+(getU()['Печать']||'Print');
 if(raw==='♙ Преподаватели')return '♙ '+(getU()['Преподаватели']||'Teachers');
 if(raw==='Все 5 групп')return getU()['Все группы']||'All groups';
 if(raw==='Самоподг.')return getU()['Самоподготовка']||'Self-study';
 if(raw.startsWith('+ Создать неделю'))return '+ '+(getU()['Создать неделю']||'Create week');
 if(raw.startsWith('+ Строка пары'))return '+ '+(getU()['Строка пары']||'Add period');
 if(raw==='+ Добавить')return '+ '+(getU()['Строка пары']||'Add');
 if(raw.endsWith(' — нет данных'))return raw.replace(' — нет данных',' — '+({'isv':'nema danych','la':'nulla data','bxr':'мэдээсэл үгы','ns84':'нетпо','tlh':'De’ tu’lu’be’','ja':'データなし','sv':'inga uppgifter'}[language]||'No data'));
 if(raw==='с/з')return getU()['Спортзал']||'Sports hall';
 if(raw.startsWith('класс '))return (getU()['Класс']||'Room')+' '+raw.slice(6);
 if(raw.startsWith('ауд. '))return (getU()['Аудитория']||'Room')+' '+raw.slice(5);
 if(raw.startsWith('Подгруппа '))return (getU()['Подгруппы']||'Subgroup')+' '+raw.slice(10);
 if(raw.startsWith('Группа '))return (getU()['Группа']||'Group')+' '+raw.slice(7);
 // Avoid splitting arbitrary text containing slashes (e.g. PDF / Excel).
 if(raw.includes(' / ')&&raw.split(' / ').every(x=>getSubjectId(x)))return raw.split(' / ').map(x=>subject(getSubjectId(x),x)).join(' / ');
 // Mixed informational strings: keep data intact but translate known names and terminology.
 const localPhrases={
  'ja':{
    'В архиве этот предмет вели: ':'以前の担当教員：',
    'По выбранному преподавателю: ':'選択中の教員：',
    'ауд. ':'教室 ', 'аудитория не указана':'教室未設定',
    'Обычно ':'通常：', 'Это подсказка, не правило.':'候補です。変更できます。',
    'Новая дисциплина':'新しい科目','Необычная аудитория':'普段と異なる教室',
    'Аудитория отличается от привычной':'普段と違う教室',
    'Фамилия отсутствует в справочнике':'教員一覧に登録されていません',
    'Новый преподаватель по дисциплине':'この科目の新しい担当教員',
    'Предмет есть в справочнике, но преподаватели пока не подтверждены.':'科目は登録済みですが、担当教員は未確認です。',
    'Название курса беспилотных систем объединено предварительно.':'無人機システムの科目名は暫定的にまとめています。',
    'В справочнике нет такой дисциплины. Можно сохранить новое название.':'この科目は未登録です。新しい名前として保存できます。'
  },
  'tlh':{
    'В архиве этот предмет вели: ':"QeDvam ghojmoHpu': ",
    'По выбранному преподавателю: ':"ghojmoHwI' wIvpu'bogh: ",
    'ауд. ':"pa' ", 'аудитория не указана':"pa' tu'lu'be'",
    'Обычно ':"motlh: ", 'Это подсказка, не правило.':"qech neH; chut 'oHbe'.",
    'Новая дисциплина':"QeD chu'",'Необычная аудитория':"pa' motlhbe'",
    'Аудитория отличается от привычной':"pa' motlhbe' tu'lu'",
    'Фамилия отсутствует в справочнике':"ghojmoHwI' pong tetlhDaq tu'lu'be'",
    'Новый преподаватель по дисциплине':"QeDvam ghojmoHwI' chu'",
    'Предмет есть в справочнике, но преподаватели пока не подтверждены.':"QeD tu'lu', 'ach ghojmoHwI' Sovlu'be'.",
    'Название курса беспилотных систем объединено предварительно.':"nuv Hutlhbogh Duj QeD pongmey wa'moHlu'.",
    'В справочнике нет такой дисциплины. Можно сохранить новое название.':"QeDvam tu'lu'be'. pong chu' yIpol."
  }
 };
 const phrases={
  'В архиве этот предмет вели: ':'Previously taught by: ',
  'По выбранному преподавателю: ':'For the selected teacher: ',
  'ауд. ':'Room ',
  'аудитория не указана':'room not specified',
  'Обычно ':'Usually room ',
  'Это подсказка, не правило.':'This is a suggestion, not a rule.',
  'Новая дисциплина':'New subject',
  'Необычная аудитория':'Unusual room',
  'Аудитория отличается от привычной':'Room differs from usual',
  'Фамилия отсутствует в справочнике':'Teacher not in directory',
  'Новый преподаватель по дисциплине':'New teacher for subject',
  'Предмет есть в справочнике, но преподаватели пока не подтверждены.':'The subject is in the directory, but the teachers are not confirmed yet.',
  'Название курса беспилотных систем объединено предварительно.':'The unmanned systems course labels were combined provisionally.',
  'В справочнике нет такой дисциплины. Можно сохранить новое название.':'This subject is not in the directory. You may save a new name.'
 };
 if(language==='sv'){
   const svenska={
     'В архиве этот предмет вели: ':'Tidigare lärare för ämnet: ',
     'По выбранному преподавателю: ':'För vald lärare: ',
     'ауд. ':'Sal ',
     'аудитория не указана':'sal saknas',
     'Обычно ':'Vanlig sal: ',
     'Это подсказка, не правило.':'Det är ett förslag, inte en regel.',
     'Новая дисциплина':'Nytt ämne',
     'Необычная аудитория':'Ovanlig sal',
     'Аудитория отличается от привычной':'Salen avviker från den vanliga',
     'Фамилия отсутствует в справочнике':'Läraren finns inte i registret',
     'Новый преподаватель по дисциплине':'Ny lärare för ämnet',
     'Предмет есть в справочнике, но преподаватели пока не подтверждены.':'Ämnet finns i registret, men lärarna är ännu inte bekräftade.',
     'Название курса беспилотных систем объединено предварительно.':'Kursnamnen för obemannade system har slagits samman tills vidare.',
     'В справочнике нет такой дисциплины. Можно сохранить новое название.':'Ämnet finns inte i registret. Du kan spara ett nytt namn.'
   };
   let out=raw,changed=false;
   for(const [from,to] of Object.entries(svenska))if(out.includes(from)){out=out.split(from).join(to);changed=true;}
   for(const t of teacherList){for(const value of [t.displayName,t.surname])if(value&&out.includes(value)){out=out.split(value).join(teacherLabel(t));changed=true;}}
   for(const [id,russian] of Object.entries(bundle.translations.ru.subjects||{}))if(russian&&out.includes(russian)){out=out.split(russian).join(subject(id,russian));changed=true;}
   if(changed)return out;
 }
 let out=raw,changed=false;
 if(/\d+-й курс · все 5 групп/.test(out)){out=out.replace(/(\d+)-й курс · все 5 групп/,(_,n)=>(getU()['Курс']||'Year')+' '+n+' · '+(getU()['Все группы']||'all groups'));changed=true;}
 if(out.includes('кл. ')){out=out.replaceAll('кл. ',(getU()['Класс']||'Room')+' ');changed=true;}
 if(out.includes('1-я пара')||out.includes('2-я пара')||out.includes('3-я пара')||out.includes('4-я пара')){out=out.replace(/(\d+)-я пара/g,(_,n)=>(getU()['Пара']||'Period')+' '+n);changed=true;}
 const counts=out.match(/^(\d+) критических · (\d+) предупреждений · (\d+) информационных заметок · (\d+) загруженных групп$/);
 if(counts&&language==='ja')return `${counts[1]} 件の重大エラー · ${counts[2]} 件の警告 · ${counts[3]} 件のメモ · ${counts[4]} グループ読み込み済み`;
 if(counts&&language==='tlh')return `${counts[1]} Qaghmey potlh · ${counts[2]} ghu'mey · ${counts[3]} De'mey · ${counts[4]} ghommey`;
 if(counts)return language==='sv'?`${counts[1]} kritiska · ${counts[2]} varningar · ${counts[3]} notiser · ${counts[4]} inlästa grupper`:`${counts[1]} critical · ${counts[2]} warnings · ${counts[3]} notes · ${counts[4]} groups loaded`;
 const loaded=out.match(/^Загружено (\d+) из (\d+) групп\. Остальные группы не считаются свободными\.$/);
 if(loaded&&language==='ja')return `${loaded[2]} グループ中 ${loaded[1]} グループを読み込みました。未登録のグループは空きとみなしません。`;
 if(loaded&&language==='tlh')return `${loaded[2]} ghommeyvo' ${loaded[1]} ghommey De' tu'lu'. Hutlhbogh ghommey chIm 'oHbe'.`;
 if(loaded)return language==='sv'?`${loaded[1]} av ${loaded[2]} grupper inlästa. Grupper som saknas räknas inte som lediga.`:`${loaded[1]} of ${loaded[2]} groups loaded. Missing groups are not considered free.`;
 const unusual=out.match(/^Необычная аудитория: (.+?)\. Преподаватель: (.+?); обычная аудитория — (.+?) \(\d+ из (\d+) занятий за две недели\)\. Проверь по оригиналу; перенос возможен\.$/);
 if(unusual){const t=teacherList.find(x=>x.displayName===unusual[2]||x.surname===unusual[2]);if(language==='ja')return `普段と異なる教室：${unusual[1]}。教員：${t?teacherLabel(t):unusual[2]}。普段の教室：${unusual[3]}（2週間で${unusual[5]}授業中）。原本を確認してください。`;if(language==='tlh')return `pa' motlhbe': ${unusual[1]}. ghojmoHwI': ${t?teacherLabel(t):unusual[2]}; motlh pa': ${unusual[3]}. De' yInuD.`;return language==='sv'?`Ovanlig sal: ${unusual[1]}. Lärare: ${t?teacherLabel(t):unusual[2]}; vanlig sal: ${unusual[3]} (${unusual[4]} av ${unusual[5]} lektioner under två veckor). Kontrollera originalet; bytet kan vara avsiktligt.`:`Unusual room: ${unusual[1]}. Teacher: ${t?teacherLabel(t):unusual[2]}; typical room: ${unusual[3]} (${unusual[4]} of ${unusual[5]} lessons across two weeks). Check the original; the change may be intentional.`;}

 // This only affects rendered text; no changes to the canonical JSON records.
 for(const [from,to] of Object.entries(localPhrases[language]||phrases))if(out.includes(from)){out=out.split(from).join(to);changed=true;}
 for(const t of teacherList){for(const value of [t.displayName,t.surname])if(value&&out.includes(value)){out=out.split(value).join(teacherLabel(t));changed=true;}}
 for(const [id,russian] of Object.entries(bundle.translations.ru.subjects||{}))if(russian&&out.includes(russian)){out=out.split(russian).join(subject(id,russian));changed=true;}
 return changed?out:raw;
}
function translateNode(node){if(node.nodeType!==3)return;const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,pre,code,svg,noscript'))return;
 const value=node.nodeValue;if(!value||!value.trim())return;
 let memo=textSources.get(node);
 if(!memo){memo={source:value,last:null};textSources.set(node,memo)}
 else if(value!==memo.last&&value!==memo.source){memo.source=value}
 const m=memo.source.match(/^(\s*)([\s\S]*?)(\s*)$/);
 const translated=(m?m[1]+localize(m[2])+m[3]:localize(memo.source));
 if(node.nodeValue!==translated){memo.last=translated;node.nodeValue=translated}else memo.last=translated;
}
function translateAttrs(node){if(!node.getAttribute)return;for(const key of ['placeholder','title','aria-label','alt']){
 if(!node.hasAttribute(key))continue;
 let mem=attributeSources.get(node);if(!mem){mem={};attributeSources.set(node,mem)}
 let m=mem[key],current=node.getAttribute(key);if(!m){m={source:current,last:null};mem[key]=m}
 else if(current!==m.last&&current!==m.source)m.source=current;
 const next=localize(m.source);if(current!==next){m.last=next;node.setAttribute(key,next)}else m.last=next;
 }}
function applyTree(root){if(!bundle||!root)return;
 if(root.nodeType===3){translateNode(root);return}
 if(root.nodeType!==1&&root.nodeType!==9)return;
 if(root.nodeType===1&&root.closest('script,style,textarea,pre,code,svg,noscript'))return;
 const iterator=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
 if(root.nodeType===1)translateAttrs(root);
 while(iterator.nextNode()){const node=iterator.currentNode;if(node.nodeType===3)translateNode(node);else translateAttrs(node)}
}
let scheduled=false;
function schedule(){if(scheduled||!bundle)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;applyTree(document.body)})}
function languageSelector(){let sel=document.getElementById('siteLanguage');if(!sel)return;
 sel.innerHTML=DEFAULTS.map(l=>`<option value="${l[0]}">${l[1]}</option>`).join('');
 if(!DEFAULTS.some(l=>l[0]===language))language='ru';sel.value=language;
 sel.onchange=()=>setLanguage(sel.value);

}
function setLanguage(code){if(!DEFAULTS.some(l=>l[0]===code))return;language=code;
 try{localStorage.setItem(KEY,code)}catch(_){}
 document.documentElement.lang=code==='ko-N'||code==='ko-S'?'ko':code==='tok'?'tok':code==='ns84'?'x-newspeak':code;
 languageSelector();
 window.dispatchEvent(new CustomEvent('raspissanie-language-change',{detail:{language}}));
 schedule();
}
function loaded(){return !!bundle}
async function init(){try{
 const embedded=document.getElementById('embeddedI18n');
 if(embedded)bundle=JSON.parse(embedded.textContent);
 else{
  const url=document.currentScript?.dataset?.locales||document.querySelector('script[data-locales]')?.dataset.locales||'./data/i18n.json';
  const resp=await fetch(url);if(!resp.ok)throw new Error('i18n HTTP '+resp.status);bundle=await resp.json();
 }
 if(!bundle?.translations?.ru)throw new Error('Invalid i18n dictionary');
 document.documentElement.lang=language==='ko-N'||language==='ko-S'?'ko':language==='ns84'?'x-newspeak':language;
 languageSelector();schedule();
 observer=new MutationObserver(()=>schedule());observer.observe(document.body,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']});
 window.dispatchEvent(new CustomEvent('raspissanie-language-change',{detail:{language,init:true}}));
 }catch(err){console.error('Could not load language data, Russian interface is available:',err);language='ru';languageSelector()}
}
window.RaspI18n={init,setLanguage,language:()=>language,date,week,count,subject,subjectId:getSubjectId,canonicalSubject,teacher:teacherLabel,registerTeachers,localize,apply:schedule,ready:loaded,options:DEFAULTS};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
