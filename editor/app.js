/* Расписсание. Локальный редактор расписания — без серверной записи. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const I18n=window.RaspI18n;
const isoDate=d=>new Date(d).toISOString().slice(0,10);
const cp=o=>JSON.parse(JSON.stringify(o));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayNames=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const norm=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
const addDays=(iso,n)=>{const [y,m,d]=iso.split('-').map(Number);return isoDate(Date.UTC(y,m-1,d+n))};
const monday=iso=>{const d=new Date(iso+'T12:00:00Z');return addDays(iso,-((d.getUTCDay()+6)%7))};
const nice=iso=>I18n.date(iso,{day:'numeric',month:'long'});
const academicWeek=iso=>{const year=Number(iso.slice(0,4));const sep= year&&iso < `${year}-09-01`?`${year-1}-09-01`:`${year}-09-01`;return Math.floor((Date.parse(monday(iso))-Date.parse(monday(sep)))/604800000)+1};
const storageKey=w=>'raspissanie-editor-draft-v2:'+w;
const GROUPS=Array.from({length:3},(_,course)=>Array.from({length:5},(_,i)=>`${course+1}0${i+1}`)).flat();
const state={weeks:{},active:'',course:3,day:0,mode:'manual',dirty:false,teachers:[],roomPatterns:null,subjectDirectory:[],subjects:[],rooms:[],stage:[],stageWarnings:[],stageSource:'',stagePreviewUrl:null,editing:null,initialized:false};
let toastTimer;
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3600)}
function getWeek(){return state.weeks[state.active]}
function weekGroups(course=state.course){return GROUPS.filter(g=>Number(g[0])===Number(course))}
function ensureGroup(week,group){if(!week.groups[group])week.groups[group]={course:Number(group[0]),description:Number(group[0])===3?'Cessna-172S · Da-42':'Cessna-172S',days:{}};return week.groups[group]}
function ensureDay(week,g,date){const gd=ensureGroup(week,g);if(!gd.days[date])gd.days[date]={lessons:[]};return gd.days[date].lessons}
function randId(g,d,num){return `${g}-${d}-${num}-${Math.random().toString(36).slice(2,7)}`}
function currentDay(){return addDays(state.active,state.day)}
function yearRange(iso){return `${nice(iso)} — ${nice(addDays(iso,5))}`}
function validity(week){return !!(week&&typeof week==='object'&&/^\d{4}-\d\d-\d\d$/.test(week.weekStart||'')&&typeof week.groups==='object'&&week.groups!==null&&Object.values(week.groups).every(g=>g&&typeof g.days==='object'&&Object.values(g.days).every(day=>day&&Array.isArray(day.lessons))))}
function subjectRec(str){const value=norm(str),translatedId=I18n.subjectId(str);return state.subjectDirectory.find(s=>s.id===str||s.id===translatedId||[s.name,...(s.aliases||[])].some(name=>norm(name)===value))||null}
function canonicalSubject(str){const raw=String(str||'').trim();const rec=subjectRec(raw);return {subject:rec?.name||raw,subjectId:rec?.id||null}}
function subjectTeachers(subject){return subjectRec(subject)?.teachers||[]}
function describeSubjectHint(subject,teacher){
 const rec=subjectRec(subject);if(!rec)return subject?'В справочнике нет такой дисциплины. Можно сохранить новое название.':'';
 const candidates=rec.teachers||[];if(!candidates.length)return 'Предмет есть в справочнике, но преподаватели пока не подтверждены.';
 const selected=teacherRec(teacher);const filtered=selected?candidates.filter(t=>t.teacherId===selected.id):candidates;
 const items=filtered.length?filtered:candidates;
 const notes=items.slice(0,5).map(t=>`${t.teacherName} — ${Object.keys(t.rooms||{}).length?Object.entries(t.rooms).map(([room,n])=>`ауд. ${room} (${n})`).join(', '):'аудитория не указана'}`);
 const prefix=selected&&filtered.length?'По выбранному преподавателю: ':'В архиве этот предмет вели: ';
 return prefix+notes.join('; ')+(items.length>5?'; …':'')+(rec.needsConfirmation?' Название курса беспилотных систем объединено предварительно.':'');
}
function fillSuggestion(subjectInput,teacherInput,roomInput){
 const rec=subjectRec(subjectInput.value);if(!rec){toast('Выбери дисциплину из справочника');return}
 subjectInput.value=rec.name;
 const candidates=rec.teachers||[];
 let selected=teacherRec(teacherInput.value);
 let pair=selected?candidates.find(t=>t.teacherId===selected.id):null;
 // Не выбираем преподавателя за пользователя, если у одного предмета их несколько.
 if(!selected&&candidates.length===1){pair=candidates[0];teacherInput.value=pair.teacherName}
 if(!roomInput.value.trim()){
   let suggested=pair?.usualRoom;
   if(!suggested&&pair){const rooms=Object.entries(pair.rooms||{}).sort((a,b)=>b[1]-a[1]);if(rooms.length===1)suggested=rooms[0][0]}
   if(!suggested&&candidates.length===1){const rooms=Object.keys(candidates[0].rooms||{});if(rooms.length===1)suggested=rooms[0]}
   if(suggested)roomInput.value=suggested;
 }
 renderRoomHint();
}
function renderSubjectHints(){
 if($('lessonKind').value==='lesson'){
  const subject=$('lessonSubject').value,teacher=$('lessonTeacher').value;
  const hint=describeSubjectHint(subject,teacher),el=$('subjectHint');el.textContent=hint;el.hidden=!hint;
  $('fillSubjectSuggestion').hidden=!subjectRec(subject);
 }else if($('lessonKind').value==='split'){
  for(const i of [0,1]){
   const sub=$('splitFieldRows').querySelector(`[data-v="${i}"][data-f="subject"]`),te=$('splitFieldRows').querySelector(`[data-v="${i}"][data-f="teacher"]`),hint=$('splitFieldRows').querySelector(`[data-subject-hint="${i}"]`),btn=$('splitFieldRows').querySelector(`[data-fill-v="${i}"]`);
   if(!sub||!te||!hint||!btn)continue;const text=describeSubjectHint(sub.value,te.value);
   hint.textContent=text;hint.hidden=!text;btn.hidden=!subjectRec(sub.value);
  }
 }
}
function teacherRec(str){return state.teachers.find(t=>[t.displayName,t.surname,I18n.teacher(t),...(t.aliases||[])].some(s=>norm(s)===norm(str)))}
function canonicalTeacher(str){const item=teacherRec(str);return item?{teacher:item.surname,teacherId:item.id}:{teacher:String(str||'').trim(),teacherId:null}}
function teacherLabel(id,fallback){const match=teacherRec(fallback)||state.teachers.find(t=>t.id===id);return match?I18n.teacher(match):fallback||'—'}
// Предпочитаемые аудитории сформированы только по опубликованным неделям.
// Локальные правки и будущие недели НЕ переучивают справочник автоматически.
function typicalRoom(teacher,subject){
 const t=teacherRec(teacher);if(!t||!state.roomPatterns)return null;
 const s=norm(canonicalSubject(subject).subject);
 const matching=state.roomPatterns.teacherSubjects?.find(r=>r.teacherId===t.id&&norm(r.subject)===s);
 const source=matching?.preferredRoom?matching:state.roomPatterns.teachers?.[t.id];
 if(!source?.preferredRoom)return null;
 return {room:source.preferredRoom,count:source.count,rooms:source.rooms,basis:source.basis,scope:source===matching?'subject':'teacher',name:t.displayName};
}
function roomDifference(teacher,subject,room){
 const found=typicalRoom(teacher,subject);
 if(!found||!String(room||'').trim()||norm(room)===norm(found.room))return null;
 return {...found,actual:String(room).trim()};
}
function roomWarningText(match){
 const frequency=match.rooms[match.room]||0;
 return `Необычная аудитория: ${match.actual}. Преподаватель: ${match.name}; обычная аудитория — ${match.room} (${frequency} из ${match.count} занятий за две недели). Проверь по оригиналу; перенос возможен.`;
}
function renderRoomHint(){
 const kind=$('lessonKind').value,items=[];
 if(kind==='lesson')items.push({teacher:$('lessonTeacher').value,subject:$('lessonSubject').value,room:$('lessonRoom').value});
 else if(kind==='split')for(const i of [0,1]){const fields={};for(const inp of $('splitFieldRows').querySelectorAll(`[data-v="${i}"]`))fields[inp.dataset.f]=inp.value;items.push(fields)}
 const notes=[];let warning=false;
 for(let i=0;i<items.length;i++){
  const item=items[i],comparison=roomDifference(item.teacher,item.subject,item.room),base=typicalRoom(item.teacher,item.subject);
  if(!base)continue;
  const prefix=kind==='split'?`Подгруппа ${i+1}: `:'';
  if(comparison){warning=true;notes.push(prefix+roomWarningText(comparison))}
  else notes.push(`${prefix}Обычно ${base.room} — ${base.rooms[base.room]} из ${base.count} занятий (две недели). Это подсказка, не правило.`);
 }
 const node=$('roomHint');node.hidden=!notes.length;node.classList.toggle('warning',warning);node.textContent=notes.join('  •  ');renderSubjectHints();
}
function changedRoomWarnings(l,prev){
 const current=l.kind==='split'?l.variants||[]:l.kind==='self_study'?[]:[l];
 const before=prev?.kind==='split'?prev.variants||[]:prev?.kind==='self_study'?[]:prev?[prev]:[];
 return current.map((v,i)=>({value:v,old:before[i]})).filter(({value,old})=>!old||norm(value.room)!==norm(old.room)||norm(value.subject)!==norm(old.subject)||norm(value.teacher)!==norm(old.teacher))
  .map(({value})=>roomDifference(value.teacher,value.subject,value.room)).filter(Boolean);
}

function normalizeLesson(l,g,date,index){const kind=l.kind||'lesson';const res={...l,id:l.id||randId(g,date,l.number||index+1),number:Number(l.number)||index+1,kind};if(kind==='self_study'){res.subject='Самоподготовка';res.subjectId='activity-self-study';delete res.subjectIds;res.teacher=null;res.room=null;delete res.teacherId;delete res.teacherIds;delete res.variants;return res}if(kind==='split'){
 res.variants=(l.variants||[]).map(v=>{const rec=canonicalTeacher(v.teacher);return {...canonicalSubject(v.subject),teacher:rec.teacher,room:String(v.room||'').trim(),...(rec.teacherId?{teacherId:rec.teacherId}:{})}});
 res.subject=res.variants.map(v=>v.subject).join(' / ');res.teacher=res.variants.map(v=>v.teacher).join(' / ');res.room=res.variants.map(v=>v.room).join(' / ');delete res.teacherId;delete res.subjectId;res.subjectIds=res.variants.map(v=>v.subjectId).filter(Boolean);res.teacherIds=res.variants.map(v=>v.teacherId).filter(Boolean);return res}
 const rec=canonicalTeacher(l.teacher);Object.assign(res,canonicalSubject(l.subject));delete res.subjectIds;res.teacher=rec.teacher||null;res.room=l.room==null?null:String(l.room).trim();if(rec.teacherId)res.teacherId=rec.teacherId;else delete res.teacherId;delete res.teacherIds;delete res.variants;return res}
function normalizeWeek(week){const w=cp(week);w.schemaVersion=2;w.weekStart=monday(w.weekStart);w.weekEnd=addDays(w.weekStart,5);w.academicWeek=academicWeek(w.weekStart);delete w.institution;w.groups=w.groups||{};for(const [g,gd] of Object.entries(w.groups))for(const [date,day] of Object.entries(gd.days||{})){day.lessons=(day.lessons||[]).map((l,i)=>normalizeLesson(l,g,date,i)).sort((a,b)=>a.number-b.number)}w.missingGroups=GROUPS.filter(g=>!w.groups[g]);return w}
function markDirty(){state.dirty=true;$('dirtyBadge').textContent='Есть локальные правки';$('dirtyBadge').classList.add('dirty');try{localStorage.setItem(storageKey(state.active),JSON.stringify(getWeek()));$('storageStatus').textContent='Черновик сохранён локально · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}catch(e){$('storageStatus').textContent='Локальное хранилище недоступно — скачай JSON!'} }
function restoreDraft(base){let draft;try{draft=JSON.parse(localStorage.getItem(storageKey(base.weekStart))||'null')}catch(e){}return validity(draft)?normalizeWeek(draft):normalizeWeek(base)}
function newEmptyWeek(start){return {schemaVersion:2,weekStart:monday(start),weekEnd:addDays(monday(start),5),academicWeek:academicWeek(monday(start)),source:{kind:'manual',description:'Создано в браузерном редакторе'},missingGroups:[...GROUPS],groups:{}}}
function normalizeImportedWeek(w){return normalizeWeek(w)}
function upsertWeek(w,mark=false){w=normalizeImportedWeek(w);state.weeks[w.weekStart]=w;if(mark){state.active=w.weekStart;markDirty()}populateWeeks()}
function populateWeeks(){const list=Object.keys(state.weeks).sort();$('weekSelect').innerHTML=list.map(w=>`<option value="${esc(w)}">${I18n.week(state.weeks[w].academicWeek)} · ${nice(w)}–${nice(addDays(w,5))}</option>`).join('');$('weekSelect').value=state.active;$('weekRange').textContent=state.active?`${yearRange(state.active)} · ${state.active.slice(0,4)}`:''}
function populateDay(){const w=getWeek();$('daySelect').innerHTML=dayNames.map((day,i)=>`<option value="${i}">${I18n.localize(day)}, ${nice(addDays(w.weekStart,i))}</option>`).join('');$('daySelect').value=String(state.day)}
function switchWeek(week){if(!state.weeks[week])return;state.active=week;state.dirty=false;$('dirtyBadge').textContent='Черновик готов';$('dirtyBadge').classList.remove('dirty');state.day=0;populateWeeks();populateDay();renderGrid();runChecks(false)}
function renderGrid(){const w=getWeek(),glist=weekGroups(),date=currentDay();$('gridInfo').textContent=`${I18n.localize(dayNames[state.day])}, ${nice(date)} · ${state.course}-й курс · все 5 групп`;
 const thead=$('scheduleGrid').tHead,tbody=$('scheduleGrid').tBodies[0];thead.innerHTML='<tr><th scope="col">Пара</th>'+glist.map(g=>`<th scope="col">${g}</th>`).join('')+'</tr>';
 const maxSlot=Math.max(4,...glist.flatMap(g=>(w.groups[g]?.days?.[date]?.lessons||[]).map(l=>l.number)),1);let rows='';for(let slot=1;slot<=maxSlot;slot++){
 rows+=`<tr><td>${slot}</td>`;for(const group of glist){const matches=(w.groups[group]?.days?.[date]?.lessons||[]).filter(l=>l.number===slot);let content;if(matches.length){content=matches.map(l=>{let subj=l.kind==='self_study'?I18n.localize('Самоподготовка'):l.kind==='split'?l.variants.map(v=>I18n.subject(v.subjectId||subjectRec(v.subject)?.id,v.subject)).join(' / '):I18n.subject(l.subjectId||subjectRec(l.subject)?.id,l.subject);const details=l.kind==='self_study'?'':l.kind==='split'?'По подгруппам':`${teacherLabel(l.teacherId,l.teacher)} · ${l.room==='с/з'?'спортзал':('кл. '+(l.room||'—'))}`;return `<button class="cell-lesson ${l.kind==='self_study'?'self':''} ${l.kind==='split'?'split':''} ${matches.length>1?'duplicate':''}" data-group="${group}" data-slot="${slot}" data-id="${esc(l.id)}"><span>${esc(subj)}</span>${details?`<small>${esc(details)}</small>`:''}</button>`}).join('')}
 else content=`<button class="cell-lesson empty" data-group="${group}" data-slot="${slot}" aria-label="Добавить занятие для ${group} группы на ${slot}-ю пару">+ Добавить</button>`;rows+=`<td>${content}</td>`}rows+='</tr>'}
 tbody.innerHTML=rows;tbody.querySelectorAll('[data-group]').forEach(btn=>btn.addEventListener('click',()=>openLesson(btn.dataset.group,Number(btn.dataset.slot),btn.dataset.id||null)));
}
function setTab(tab){state.mode=tab;for(const name of ['manual','import','checks']){$(`${name}Panel`).hidden=name!==tab;const btn=document.querySelector(`.tab[data-tab="${name}"]`);btn.classList.toggle('active',name===tab);btn.setAttribute('aria-selected',String(name===tab))}if(tab==='checks')runChecks(true)}
function buildLists(){const subs=new Set(),rooms=new Set();for(const w of Object.values(state.weeks))for(const gd of Object.values(w.groups||{}))for(const day of Object.values(gd.days||{}))for(const l of day.lessons||[]){if(l.kind==='self_study')continue;for(const v of l.kind==='split'?(l.variants||[]):[l]){if(v.subject)subs.add(v.subject);if(v.room)rooms.add(v.room)}}state.subjects=[...new Set([...state.subjectDirectory.map(s=>s.name),...subs])].sort((a,b)=>a.localeCompare(b,'ru'));state.rooms=[...rooms].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));$('subjectsList').innerHTML=state.subjects.map(s=>`<option value="${esc(I18n.subject(subjectRec(s)?.id,s))}"></option>`).join('');$('teachersList').innerHTML=state.teachers.map(t=>`<option value="${esc(I18n.teacher(t))}"></option>`).join('');$('roomsList').innerHTML=state.rooms.map(s=>`<option value="${esc(s)}"></option>`).join('')}
function openLesson(group,number,id){state.editing={group,date:currentDay(),id};const list=getWeek().groups[group]?.days?.[currentDay()]?.lessons||[];const old=id?list.find(x=>x.id===id):null;$('lessonDialogTitle').textContent=id?'Изменить занятие':'Добавить занятие';$('lessonContext').textContent=`${group} · ${I18n.localize(dayNames[state.day])}, ${nice(currentDay())}`;$('lessonNumber').innerHTML=Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');$('lessonNumber').value=String(old?.number||number);$('lessonKind').value=old?.kind||'lesson';$('lessonSubject').value=old?.kind==='split'?'':old?I18n.subject(old.subjectId||subjectRec(old.subject)?.id,old.subject):'';$('lessonTeacher').value=old?.kind==='split'?'':old?teacherLabel(old.teacherId,old.teacher):'';$('lessonRoom').value=old?.kind==='split'?'':old?.room||'';
 const variants=old?.variants||[{subject:'',teacher:'',room:''},{subject:'',teacher:'',room:''}];$('splitFieldRows').innerHTML=[0,1].map(i=>{const v=variants[i]||{};return `<div class="split-box"><h3>Подгруппа ${i+1}</h3><div class="form-grid"><label class="full">Дисциплина<input data-v="${i}" data-f="subject" list="subjectsList" value="${esc(I18n.subject(v.subjectId||subjectRec(v.subject)?.id,v.subject||''))}"></label><label>Преподаватель<input data-v="${i}" data-f="teacher" list="teachersList" value="${esc(teacherLabel(v.teacherId,v.teacher)==='—'?'':teacherLabel(v.teacherId,v.teacher))}"></label><label>Аудитория<input data-v="${i}" data-f="room" list="roomsList" value="${esc(v.room||'')}"></label></div><div class="suggestion-action"><span class="subject-hint" data-subject-hint="${i}" hidden></span><button class="suggestion-btn" type="button" data-fill-v="${i}" hidden>Подставить из справочника</button></div></div>`}).join('');$('deleteLessonBtn').hidden=!id;adjustKind();renderRoomHint();$('lessonDialog').showModal()}
function adjustKind(){const kind=$('lessonKind').value;$('singleFields').hidden=kind!=='lesson';$('splitFields').hidden=kind!=='split';renderRoomHint()}
function closeLesson(){$('lessonDialog').close();state.editing=null}
function saveLesson(ev){ev.preventDefault();const {group,date,id}=state.editing||{};if(!group)return;const list=ensureDay(getWeek(),group,date);const prev=id?list.find(l=>l.id===id):null;const kind=$('lessonKind').value,number=Number($('lessonNumber').value);let l=prev?cp(prev):{id:randId(group,date,number)};l.number=number;l.kind=kind;
 if(kind==='self_study'){l.subject='Самоподготовка';l.teacher=null;l.room=null;delete l.variants;delete l.teacherId}
 else if(kind==='lesson'){l.subject=$('lessonSubject').value.trim();if(!l.subject){toast('Укажи название дисциплины');return}const r=canonicalTeacher($('lessonTeacher').value);l.teacher=r.teacher||null;l.room=$('lessonRoom').value.trim()||null;if(r.teacherId)l.teacherId=r.teacherId;else delete l.teacherId;delete l.variants}
 else{const vs=[0,1].map(i=>{const v={};for(const inp of $('splitFieldRows').querySelectorAll(`[data-v="${i}"]`))v[inp.dataset.f]=inp.value.trim();const rec=canonicalTeacher(v.teacher);return {...v,teacher:rec.teacher,...(rec.teacherId?{teacherId:rec.teacherId}:{})}});if(vs.some(v=>!v.subject)){toast('Заполни названия дисциплин обеих подгрупп');return}l.variants=vs;l.subject=vs.map(v=>v.subject).join(' / ');l.teacher=vs.map(v=>v.teacher).join(' / ');l.room=vs.map(v=>v.room).join(' / ');delete l.teacherId}
 const atypical=changedRoomWarnings(l,prev);if(atypical.length&&!confirm(atypical.map(roomWarningText).join('\n\n')+'\n\nСохранить это занятие с указанной аудиторией?'))return;
 l=normalizeLesson(l,group,date,number-1);if(prev)list[list.indexOf(prev)]=l;else list.push(l);list.sort((a,b)=>a.number-b.number);markDirty();closeLesson();buildLists();renderGrid();runChecks(false);toast('Сохранено в локальном черновике')}
function delLesson(){const e=state.editing;if(!e||!e.id)return;if(!confirm('Удалить это занятие из черновика?'))return;const list=ensureDay(getWeek(),e.group,e.date);const i=list.findIndex(l=>l.id===e.id);if(i>=0)list.splice(i,1);markDirty();closeLesson();renderGrid();runChecks(false);toast('Занятие удалено')}
function createWeek(ev){ev.preventDefault();const start=monday($('newWeekDate').value);if(!start){toast('Выбери дату');return}if(state.weeks[start]&&!confirm('Такая неделя уже существует. Заменить её локальным черновиком?'))return;
 let nw=newEmptyWeek(start);if($('newWeekMethod').value==='copy'){const old=getWeek();for(const [g,gd] of Object.entries(old.groups)){for(const [date,day] of Object.entries(gd.days||{})){const d=Math.round((Date.parse(date)-Date.parse(old.weekStart))/86400000);if(d<0||d>5)continue;const nd=addDays(start,d);const target=ensureDay(nw,g,nd);target.push(...day.lessons.map(l=>({...cp(l),id:randId(g,nd,l.number)})))}}}
 nw=normalizeWeek(nw);state.weeks[start]=nw;state.active=start;state.day=0;markDirty();populateWeeks();populateDay();buildLists();renderGrid();runChecks(false);$('newWeekDialog').close();toast('Новая неделя создана')}
function exportFile(filename,content,mime='application/json;charset=utf-8'){const b=new Blob([content],{type:mime}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportWeek(){const w=normalizeWeek(getWeek());const checks=checkWeek(w);if(checks.some(x=>x.level==='error')&&!confirm('Проверка нашла серьёзные конфликты. Всё равно выгрузить JSON?')){setTab('checks');return}exportFile(`${w.weekStart}.json`,JSON.stringify(w,null,2));toast('JSON недели скачан. Для публикации загрузите файл на GitHub')}
function exportManifest(){const data=Object.keys(state.weeks).sort().map(w=>({weekStart:w,weekEnd:addDays(w,5),academicWeek:academicWeek(w),file:`data/weeks/${w}.json`}));exportFile('manifest.json',JSON.stringify(data,null,2));toast('Манифест скачан. Загрузи в data/weeks/ после JSON новой недели')}
async function importJsonFile(file){const obj=JSON.parse(await file.text());if(!validity(obj))throw new Error('Неверная структура JSON: ожидаются weekStart и groups с days/lessons');const w=normalizeWeek(obj);if(!state.weeks[w.weekStart]){state.weeks[w.weekStart]=w;state.active=w.weekStart;markDirty();populateWeeks();populateDay();buildLists();renderGrid();runChecks(false);toast('Новая неделя загружена из JSON');return}
 const choice=confirm(`Неделя ${w.weekStart} уже открыта. Нажмите OK, чтобы объединить группы из JSON с текущим черновиком (одноимённые группы будут заменены). Отмена — ничего не импортировать.`);if(!choice)return;const base=state.weeks[w.weekStart];state.active=w.weekStart;for(const [g,data] of Object.entries(w.groups))ensureGroup(base,g),base.groups[g]=data;markDirty();populateWeeks();populateDay();buildLists();renderGrid();runChecks(false);toast('Группы из JSON объединены с текущей неделей')}

// Валидатор не запрещает объединённые занятия разных групп в одной аудитории.
function checkWeek(w){const issues=[],seenTeachers=new Map(),seenRooms=new Map(),seenIds=new Set();
 function add(level,title,details){issues.push({level,title,details})}
 for(const [g,gd] of Object.entries(w.groups))for(const [date,day] of Object.entries(gd.days||{})){const perSlot=new Map();for(const l of day.lessons||[]){const pos=`${date} · ${g} · ${l.number}-я пара`;if(seenIds.has(l.id))add('error','Повторяющийся ID занятия',pos);seenIds.add(l.id);if(!Number.isInteger(l.number)||l.number<1||l.number>8)add('error','Неверный номер пары',pos);if(!perSlot.has(l.number))perSlot.set(l.number,[]);perSlot.get(l.number).push(l);if(l.kind==='self_study')continue;const vars=l.kind==='split'?l.variants||[]:[l];if(l.kind==='split'&&vars.length<2)add('warning','Неполное деление на подгруппы',pos);
 for(const v of vars){if(!String(v.subject||'').trim())add('error','Не указана дисциплина',pos);else if(!subjectRec(v.subject))add('warning','Новая дисциплина',`${pos} · ${v.subject} — отсутствует в справочнике`);if(!String(v.teacher||'').trim())add('warning','Преподаватель не указан',pos);else if(!teacherRec(v.teacher))add('warning','Фамилия отсутствует в справочнике',`${pos} · ${v.teacher}`);else if(subjectRec(v.subject)?.teachers?.length&&!subjectRec(v.subject).teachers.some(x=>x.teacherId===teacherRec(v.teacher)?.id))add('warning','Новый преподаватель по дисциплине',`${pos} · ${v.teacher}: раньше этот предмет вёл другой преподаватель — проверь по оригиналу`);if(!String(v.room||'').trim())add('warning','Не указана аудитория',pos);else if(!state.rooms.includes(v.room)&&!String(v.room).includes('/'))add('warning','Новая аудитория',`${pos} · ${v.room}`);const unusual=roomDifference(v.teacher,v.subject,v.room);if(unusual)add('warning','Аудитория отличается от привычной',`${pos} · ${roomWarningText(unusual)}`);
 const payload={date,slot:l.number,group:g,subject:v.subject||'',teacher:v.teacher||'',room:v.room||'',position:pos};for(const [key,map] of [[v.teacher?`${date}|${l.number}|${norm(v.teacher)}`:null,seenTeachers],[v.room?`${date}|${l.number}|${norm(v.room)}`:null,seenRooms]])if(key){const prev=map.get(key)||[];prev.push(payload);map.set(key,prev)} }
 }
 for(const [slot,lessons] of perSlot)if(lessons.length>1)add('error','Две записи на один слот',`${date} · ${g} · ${slot}-я пара`)}
 for(const [key,arr] of seenTeachers)if(arr.length>1){const groups=[...new Set(arr.map(x=>x.group))];if(groups.length<2)continue;const lessonSame=arr.every(a=>norm(a.subject)===norm(arr[0].subject)&&norm(a.room)===norm(arr[0].room));add(lessonSame?'info':'error',lessonSame?'Возможное объединённое занятие':'Пересечение преподавателя',`${arr[0].date}, ${arr[0].slot}-я пара · ${arr[0].teacher}: ${groups.join(', ')}`)}
 for(const [key,arr] of seenRooms)if(arr.length>1){const groups=[...new Set(arr.map(x=>x.group))];if(groups.length<2)continue;const lessonSame=arr.every(a=>norm(a.subject)===norm(arr[0].subject)&&norm(a.teacher)===norm(arr[0].teacher));if(!lessonSame)add('warning','Аудитория назначена нескольким группам',`${arr[0].date}, ${arr[0].slot}-я пара · класс ${arr[0].room}: ${groups.join(', ')}`)}
 return issues}
function runChecks(show=false){const issues=checkWeek(getWeek());if(Object.keys(getWeek().groups||{}).length<15)issues.push({level:'info',title:'Неделя заполнена не полностью',details:`Загружено ${Object.keys(getWeek().groups||{}).length} из 15 групп. Остальные группы не считаются свободными.`});$('issuesCount').textContent=String(issues.filter(x=>x.level!=='info').length);const error=issues.filter(i=>i.level==='error').length,warning=issues.filter(i=>i.level==='warning').length;$('checkSummary').textContent=`${error} критических · ${warning} предупреждений · ${issues.filter(i=>i.level==='info').length} информационных заметок · ${Object.keys(getWeek().groups||{}).length} загруженных групп`;const box=$('checkList');box.innerHTML=issues.length?issues.map(i=>`<div class="issue ${i.level==='error'?'error':i.level==='info'?'info':''}"><strong>${esc(i.title)}</strong><span>${esc(i.details)}</span></div>`).join(''):'<div class="issue info"><strong>Формальных конфликтов не обнаружено</strong><span>Это не подтверждает достоверность исходного документа. Сверьте предметы и аудитории с оригиналом.</span></div>';return issues}

// --- Импорт документов: все результаты проходят через таблицу предварительной проверки. ---
function setImportStatus(msg,isError=false){$('importStatus').textContent=msg;$('importStatus').classList.toggle('error',isError)}
function cleanDate(value,weekStart=state.active){const s=String(value??'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const weekday=['понедельник','вторник','среда','четверг','пятница','суббота'];let day=weekday.findIndex(d=>norm(s).includes(d));if(day>=0)return addDays(weekStart,day);
 let m=s.match(/(?:^|\s)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/);if(m){let y=m[3]?Number(m[3]):Number(weekStart.slice(0,4));if(y<100)y+=2000;const date=`${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;if(!Number.isNaN(Date.parse(date)))return date}
 const num=Number(s);if(num>20000&&num<80000){return isoDate(Date.UTC(1899,11,30)+Math.round(num)*86400000)}return null}
function stageRow(row,from){const group=String(row.group||'').match(/[123]0[1-5]/)?.[0]||'',date=cleanDate(row.date)||'',number=Number(row.number)||0;
 let room=String(row.room||'').trim(),subject=String(row.subject||'').trim(),teacher=String(row.teacher||'').trim(),kind=row.kind||'lesson';
 if(room.toLowerCase()==='с/п'||subject.toLowerCase()==='с/п'||norm(subject)==='самоподготовка'){kind='self_study';subject='Самоподготовка';teacher='';room=''}
 if(/^(с\/з|спортзал)$/i.test(room))room='с/з';
 if(teacher){const rec=canonicalTeacher(teacher);if(rec.teacherId)teacher=rec.teacher}
 if(kind!=='self_study')subject=canonicalSubject(subject).subject;
 return {group,date,number,subject,teacher,room,kind,from:from||'',confidence:row.confidence||'review',selected:true}}
function parseCSV(text){const first=(text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0]||'');const delim=first.includes('\t')?'\t':(first.split(';').length>first.split(',').length?';':',');const rows=[];let row=[],field='',quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){field+='"';i++}else quote=!quote}else if(!quote&&c===delim){row.push(field);field=''}else if(!quote&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>String(x).trim()))rows.push(row);row=[];field=''}else field+=c}row.push(field);if(row.some(x=>String(x).trim()))rows.push(row);return rows}
function parseNormalizedRows(rows,source){const headers={date:['дата','date','день','day'],group:['группа','group'],number:['пара','номер пары','№ пары','number','lesson'],subject:['предмет','дисциплина','название предмета','наименование предмета','subject'],teacher:['преподаватель','фамилия преподавателя','teacher'],room:['класс','аудитория','кабинет','room'],kind:['тип','kind','type']};
 let hdrIdx=-1,cols={};for(let i=0;i<Math.min(rows.length,40);i++){const fields=rows[i].map(x=>norm(x));const found={};for(const [key,patterns] of Object.entries(headers)){const col=fields.findIndex(v=>patterns.includes(v)||patterns.some(p=>v===p.replaceAll(' ','')));if(col>=0)found[key]=col}if(found.subject!==undefined&&found.group!==undefined&&(found.date!==undefined||found.number!==undefined)){hdrIdx=i;cols=found;break}}
 if(hdrIdx<0)return null;
 const result=[],notes=[];let prevDate=null,prevGroup=null;for(let i=hdrIdx+1;i<rows.length;i++){const row=rows[i];const grab=k=>cols[k]===undefined?'':row[cols[k]]||'';
 let date=cleanDate(grab('date'))||prevDate,group=String(grab('group')||'').match(/[123]0[1-5]/)?.[0]||prevGroup;
 if(date)prevDate=date;if(group)prevGroup=group;
 const subject=String(grab('subject')).trim(),room=String(grab('room')).trim();if(!subject&&!room)continue;
 const number=Number(grab('number'));if(!number)notes.push(`Строка ${i+1}: неизвестный номер пары`);
 result.push(stageRow({group,date,number,subject,teacher:grab('teacher'),room,kind:grab('kind')||'lesson',confidence:'high'},`${source}: строка ${i+1}`))}
 return {rows:result,notes,method:'Таблица с заголовками колонок'} }
function parseWideRows(rows,source){const headerIndex=rows.findIndex(r=>r.filter(x=>/\b[123]0[1-5]\s*групп/i.test(String(x))).length>=1);if(headerIndex<0)return null;
 const head=rows[headerIndex];const groups=[];for(let col=0;col<head.length;col++){const m=String(head[col]).match(/\b([123]0[1-5])\s*групп/i);if(m)groups.push({group:m[1],col})}if(!groups.length)return null;
 const notes=['Широкая таблица распознана по расположению столбцов. Проверьте порядок строк и предметы перед переносом.'];const result=[];let date=null,number=0;
 for(let i=headerIndex+1;i<rows.length;i++){const row=rows[i];const allFirst=row.slice(0,Math.max(2,groups[0].col)).map(String).join(' ');const foundDate=cleanDate(allFirst)||cleanDate(String(row[0]||''));const weekday=dayNames.some(d=>norm(allFirst).includes(norm(d)));
 if(foundDate&&(!date||foundDate!==date)){date=foundDate;number=0}
 if(row.every(c=>!String(c||'').trim()))continue;
 if(!date)continue;
 const anyData=groups.some(({col})=>String(row[col+1]||row[col+2]||'').trim()&&!/(наименование предмета|фамилия преподавателя)/i.test(String(row[col+1]||'')));
 if(!anyData)continue;
 number++;if(number>8){notes.push(`Найдено более 8 строк в одном дне (строка Excel ${i+1}).`);continue}
 for(const {group,col} of groups){const room=String(row[col]||'').trim(),subject=String(row[col+1]||'').trim(),teacher=String(row[col+2]||'').trim();if(!room&&!subject&&!teacher)continue;if(/класс|наименование|преподавател/i.test(room+' '+subject+' '+teacher))continue;result.push(stageRow({group,date,number,subject,teacher,room,confidence:'review'},`${source}: строка ${i+1}`))}
 }
 return {rows:result,notes,method:'Широкая таблица (экспериментально)'} }
function fromRows(rows,source){const normal=parseNormalizedRows(rows,source);if(normal)return normal;const wide=parseWideRows(rows,source);if(wide)return wide;throw new Error('Не найдена таблица с понятными заголовками. Для Excel используй образец CSV или ручной редактор.')}
// ZIP-ридер для .xlsx без внешних библиотек. Нужен современный браузер с DecompressionStream.
async function unzipXlsx(buffer){const buf=new Uint8Array(buffer),view=new DataView(buffer);let pos=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-66000);i--)if(view.getUint32(i,true)===0x06054b50){pos=i;break}if(pos<0)throw new Error('Excel-файл не является корректным ZIP/XLSX');const count=view.getUint16(pos+10,true),central=view.getUint32(pos+16,true),decoder=new TextDecoder(),entries={};let p=central;
 for(let i=0;i<count;i++){if(view.getUint32(p,true)!==0x02014b50)throw new Error('Повреждена таблица файлов XLSX');const method=view.getUint16(p+10,true),size=view.getUint32(p+20,true),fnameLen=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true),local=view.getUint32(p+42,true),filename=decoder.decode(buf.subarray(p+46,p+46+fnameLen));p+=46+fnameLen+extra+comment;if(!filename.endsWith('/'))entries[filename]={method,size,local}}
 async function read(filename){const e=entries[filename];if(!e)return null;const p=e.local;if(view.getUint32(p,true)!==0x04034b50)throw new Error('Повреждён XML XLSX');const start=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true),compressed=buf.slice(start,start+e.size);if(e.method===0)return decoder.decode(compressed);if(e.method!==8)throw new Error('Неизвестный способ ZIP-сжатия');if(typeof DecompressionStream==='undefined')throw new Error('Браузер не поддерживает распаковку XLSX (нужен Chrome, Firefox или Safari новой версии)');let stream;try{stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))}catch(e){throw new Error('Этот браузер не поддерживает deflate-raw в ZIP')};return decoder.decode(await new Response(stream).arrayBuffer())}
 return {read,paths:Object.keys(entries)}}
function xmlDoc(text){const d=new DOMParser().parseFromString(text,'text/xml');if(d.querySelector('parsererror'))throw new Error('Ошибка XML в Excel');return d}
function nodelist(el,tag){return el?Array.from(el.getElementsByTagName(tag)):[]}
function colIndex(cell){const m=String(cell).match(/^[A-Z]+/i);if(!m)return -1;return [...m[0].toUpperCase()].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1}
async function parseXlsx(file){const zip=await unzipXlsx(await file.arrayBuffer());const wbText=await zip.read('xl/workbook.xml');if(!wbText)throw new Error('Отсутствует workbook.xml');const wb=xmlDoc(wbText),relsText=await zip.read('xl/_rels/workbook.xml.rels'),rels=relsText?xmlDoc(relsText):null,relationships={};if(rels)for(const n of nodelist(rels,'Relationship'))relationships[n.getAttribute('Id')]=n.getAttribute('Target');
 const sharedText=await zip.read('xl/sharedStrings.xml'),shared=[];if(sharedText){const x=xmlDoc(sharedText);for(const si of nodelist(x,'si'))shared.push(nodelist(si,'t').map(t=>t.textContent).join(''))}
 const sheets=nodelist(wb,'sheet');let lastError=null;for(let index=0;index<sheets.length;index++){const sh=sheets[index];const rel=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');let path=relationships[rel]||`worksheets/sheet${index+1}.xml`;path=path.startsWith('/')?path.slice(1):path.startsWith('xl/')?path:`xl/${path.replace(/^\.\//,'')}`;const st=await zip.read(path);if(!st)continue;const doc=xmlDoc(st),rows=[];
 for(const row of nodelist(doc,'row')){const rid=Number(row.getAttribute('r'))||rows.length+1,vals=[];for(const c of nodelist(row,'c')){const col=colIndex(c.getAttribute('r'));if(col<0)continue;const typ=c.getAttribute('t'),v=nodelist(c,'v')[0]?.textContent||'',inline=nodelist(c,'is')[0];vals[col]=typ==='s'?shared[Number(v)]||'':typ==='inlineStr'?nodelist(inline,'t').map(t=>t.textContent).join(''):typ==='b'?(v==='1'?'TRUE':'FALSE'):v}rows[rid-1]=vals}for(let i=0;i<rows.length;i++)rows[i]=rows[i]||[];
 try{const parsed=fromRows(rows,sh.getAttribute('name')||`Лист ${index+1}`);if(parsed.rows.length)return {parsed,preview:rows.slice(0,60).map(r=>r.slice(0,18).join(' | ')).join('\n')}}catch(e){lastError=e}}
 throw lastError||new Error('В файле XLSX не обнаружена подходящая таблица расписания')}
function median(nums){const a=[...nums].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0}
function parsePdfPosition(items,source){const groupHeaders=items.filter(x=>/\b[123]0[1-5]\s*групп/i.test(x.s)).sort((a,b)=>a.x-b.x);const seen=new Set(),groups=[];for(const el of groupHeaders){const g=el.s.match(/\b([123]0[1-5])\s*групп/i)?.[1];if(g&&!seen.has(g)){groups.push({group:g,x:el.x});seen.add(g)}}
 const dayItems=items.filter(x=>dayNames.some(d=>norm(x.s).includes(norm(d)))&&x.s.length<40).sort((a,b)=>b.y-a.y);if(!groups.length||dayItems.length<4)return null;
 const dayCenter=[];for(let day=0;day<6;day++){const hit=dayItems.find(x=>norm(x.s).includes(norm(dayNames[day])));if(hit)dayCenter.push({day,y:hit.y})}if(dayCenter.length<4)return null;
 const distances=dayCenter.slice(1).map((o,i)=>Math.abs(o.y-dayCenter[i].y)).filter(Boolean),height=median(distances)||70;
 const classHeaders=items.filter(x=>norm(x.s)==='класс'&&Math.abs(x.y-groupHeaders[0].y)<60).sort((a,b)=>a.x-b.x);
 const candidates=[];for(const {group,x} of groups){const nearClass=classHeaders.reduce((p,c)=>Math.abs(c.x-x)<Math.abs((p?.x??1e9)-x)?c:p,null);const groupStart=nearClass?nearClass.x-4:x-8;const nextClass=classHeaders.find(c=>c.x>groupStart+10);const nextGroup=groups.find(p=>p.x>x+30);const groupEnd=Math.min(nextClass?.x-5||1e9,nextGroup?.x-3||1e9);const width=groupEnd-groupStart>60?groupEnd-groupStart:200;
 for(const {day,y} of dayCenter){const date=addDays(state.active,day);const matched=items.filter(it=>it.x>=groupStart&&it.x<groupStart+width&&Math.abs(it.y-y)<height*.49&&!/групп|наименование предмета|фамилия преподавателя|^класс$/i.test(it.s));const slots=[[],[],[],[]];for(const item of matched){const slot=Math.min(3,Math.max(0,Math.floor((y+height*.49-item.y)/(.98*height)*4)));slots[slot].push(item)}for(let i=0;i<4;i++){const current=slots[i];if(!current.length)continue;const rm=current.filter(it=>it.x<groupStart+width*.17).sort((a,b)=>b.y-a.y),sub=current.filter(it=>it.x>=groupStart+width*.17&&it.x<groupStart+width*.66).sort((a,b)=>b.y-a.y),tea=current.filter(it=>it.x>=groupStart+width*.66).sort((a,b)=>b.y-a.y);const room=rm.map(x=>x.s).join(' ').trim(),subject=sub.map(x=>x.s).join(' ').trim(),teacher=tea.map(x=>x.s).join(' ').trim();if(!room&&!subject&&!teacher)continue;candidates.push(stageRow({group,date,number:i+1,subject,teacher,room,confidence:'low'},`${source}: страница PDF`))}}}
 return {rows:candidates,method:'Текстовый PDF: распознавание координат (проверить вручную)',notes:['Разметка PDF может отличаться от бумажной таблицы. Все распознанные строки требуют сверки.']}}
async function parsePdf(file){let pdfjs;
 try{pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs')}
 catch(err){throw new Error('Для PDF-импорта требуется подключение к интернету: не загрузилась библиотека PDF.js. XLSX, CSV и ручной редактор работают без неё.')}
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}),pdf=await task.promise;const textLines=[],stages=[],notes=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent(),items=content.items.filter(t=>t.str?.trim()).map(t=>({s:t.str.trim(),x:t.transform[4],y:t.transform[5]})),lines=[];
 for(const it of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){let line=lines.find(l=>Math.abs(l.y-it.y)<3);if(!line){line={y:it.y,items:[]};lines.push(line)}line.items.push(it)}const text=lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.x-b.x).map(it=>it.s).join(' ')).join('\n');textLines.push(`--- Страница ${i} ---\n${text}`);const p=parsePdfPosition(items,`${file.name} · стр. ${i}`);if(p){stages.push(...p.rows);notes.push(...p.notes)}}
 if(!stages.length){notes.push('Автоматическое разбиение на строки не удалось. Если это скан, текстовый слой отсутствует. Используйте ручной редактор или преобразуйте PDF в нормализованную Excel-таблицу.')}
 return {parsed:{rows:stages,notes,method:'PDF.js: извлечение текстового слоя'},preview:textLines.join('\n\n')}}
function renderSourcePreview(url,file,rawText){const view=$('sourcePreview');if(file?.type==='application/pdf'||file?.name?.toLowerCase().endsWith('.pdf'))view.innerHTML=`<iframe src="${esc(url)}" title="Просмотр исходного PDF"></iframe><details><summary>Извлечённый текст</summary><pre>${esc(rawText||'')}</pre></details>`;
 else if(file?.type?.startsWith('image/'))view.innerHTML=`<img src="${esc(url)}" alt="Исходная фотография для ручной сверки">`;
 else view.innerHTML=`<pre>${esc(rawText||'Нет текстового предпросмотра')}</pre>`}
function renderStageRoomNotes(){
 const notices=state.stageWarnings.map(s=>`<div>⚠ ${esc(s)}</div>`);
 const different=state.stage.map((r,i)=>({row:r,i,match:r.kind==='self_study'?null:roomDifference(r.teacher,r.subject,r.room)})).filter(r=>r.match);
 const unexpected=[];
 for(const [i,r] of state.stage.entries()){
  if(r.kind==='self_study')continue;
  const sub=subjectRec(r.subject),teacher=teacherRec(r.teacher);
  if(r.subject&&!sub)unexpected.push(`Строка ${i+1}: новая или нераспознанная дисциплина «${r.subject}»`);
  if(r.teacher&&!teacher)unexpected.push(`Строка ${i+1}: неизвестный преподаватель «${r.teacher}»`);
  if(sub&&teacher&&sub.teachers?.length&&!sub.teachers.some(t=>t.teacherId===teacher.id))unexpected.push(`Строка ${i+1}: ранее преподаватель «${r.teacher}» не вёл «${sub.name}»`);
  if(r.room&&r.room!=='с/з'&&!state.rooms.includes(r.room))unexpected.push(`Строка ${i+1}: новая аудитория «${r.room}»`);
 }
 if(unexpected.length){notices.push(`<div><strong>Новые или необычные записи (${unexpected.length}):</strong></div>`);for(const msg of unexpected.slice(0,25))notices.push(`<div>⚠ ${esc(msg)}</div>`);if(unexpected.length>25)notices.push(`<div>… ещё ${unexpected.length-25}</div>`)}
 if(different.length){notices.push(`<div><strong>Необычные аудитории (${different.length}):</strong></div>`);for(const item of different.slice(0,15))notices.push(`<div>⚠ Строка ${item.i+1} (${esc(item.row.group||'?')}, ${esc(item.row.date||'?')}): ${esc(roomWarningText(item.match))}</div>`);if(different.length>15)notices.push(`<div>… и ещё ${different.length-15}</div>`)}
 $('stageNotes').innerHTML=notices.join('');
}
function renderStage(){const arr=state.stage;$('importWork').hidden=false;$('importFileTitle').textContent=state.stageSource||'Предпросмотр импорта';$('importStats').textContent=`${arr.length} распознанных записей · ${arr.filter(x=>x.selected).length} выбрано · проверка перед переносом обязательна`;
 const fields=[['group','Группа'],['date','Дата'],['number','Пара'],['subject','Дисциплина'],['teacher','Преподаватель'],['room','Класс']];
 $('stageTableWrap').innerHTML=arr.length?`<table class="stage-table"><thead><tr><th>✓</th>${fields.map(f=>`<th>${f[1]}</th>`).join('')}<th>Тип</th><th>Удалить</th></tr></thead><tbody>${arr.map((r,i)=>`<tr class="${r.confidence==='low'?'uncertain':''}"><td><input aria-label="Выбрать строку ${i+1}" type="checkbox" data-stage-check="${i}" ${r.selected?'checked':''}></td>${fields.map(([key])=>`<td><input aria-label="${key}, строка ${i+1}" data-stage-i="${i}" data-stage-f="${key}" ${key==='date'?'type="date"':key==='number'?'type="number" min="1" max="8"':'type="text"'} value="${esc(r[key])}"></td>`).join('')}<td><select data-stage-i="${i}" data-stage-f="kind"><option value="lesson" ${r.kind==='lesson'?'selected':''}>Пара</option><option value="self_study" ${r.kind==='self_study'?'selected':''}>Самоподг.</option><option value="split" ${r.kind==='split'?'selected':''}>Подгруппы</option></select></td><td><button type="button" class="mini-remove" data-stage-remove="${i}" aria-label="Удалить строку">×</button></td></tr>`).join('')}</tbody></table>`:'<p class="hint">Автоматически распознанных строк пока нет. Сверь исходник и заполни расписание в ручном редакторе.</p>';
 renderStageRoomNotes();$('applyStageBtn').disabled=!arr.length;
 for(const el of $('stageTableWrap').querySelectorAll('[data-stage-i]'))el.addEventListener('input',()=>{const i=Number(el.dataset.stageI),field=el.dataset.stageF;state.stage[i][field]=field==='number'?Number(el.value):el.value;renderStageRoomNotes();$('importStats').textContent=`${state.stage.length} записей · исправления будут учтены при переносе`});
 for(const el of $('stageTableWrap').querySelectorAll('[data-stage-check]'))el.addEventListener('change',()=>{state.stage[Number(el.dataset.stageCheck)].selected=el.checked});
 for(const el of $('stageTableWrap').querySelectorAll('[data-stage-remove]'))el.addEventListener('click',()=>{state.stage.splice(Number(el.dataset.stageRemove),1);renderStage()});}
async function importDocument(file){if(!file)return;setTab('import');setImportStatus('Читаю документ: '+file.name+'…');const ext=file.name.toLowerCase().split('.').pop();if(state.stagePreviewUrl)URL.revokeObjectURL(state.stagePreviewUrl);state.stagePreviewUrl=URL.createObjectURL(file);state.stageSource=file.name;state.stage=[];state.stageWarnings=[];
 try{let result=null,preview='';if(ext==='json'){const json=JSON.parse(await file.text());if(!validity(json))throw new Error('JSON должен быть файлом недели (groups / days / lessons)');const arr=[];for(const [group,gd] of Object.entries(json.groups))for(const [date,day] of Object.entries(gd.days))for(const l of day.lessons){const s=stageRow({group,date,number:l.number,subject:l.subject,teacher:l.teacher,room:l.room,kind:l.kind,confidence:'high'},`JSON ${file.name}`);if(l.kind==='split')s.variants=cp(l.variants||[]);arr.push(s)}result={rows:arr,notes:['Импортируются занятия исходной недели. Не забудьте выбрать соответствующую неделю в редакторе.'],method:'JSON недели'};preview=(await file.text()).slice(0,14000)}
 else if(ext==='csv'||ext==='tsv'){const text=await file.text();result=fromRows(parseCSV(text),file.name);preview=text.slice(0,15000)}
 else if(ext==='xlsx'){const out=await parseXlsx(file);result=out.parsed;preview=out.preview}
 else if(ext==='pdf'){const out=await parsePdf(file);result=out.parsed;preview=out.preview}
 else if(['jpg','jpeg','png'].includes(ext)){result={rows:[],notes:['Фотография загружена для визуальной сверки. Автоматический OCR для фотографий пока не подключён. Можно перейти в ручной редактор и заполнить таблицу, ориентируясь на снимок.'],method:'Просмотр фотографии'};preview=''}
 else throw new Error('Этот формат пока не поддерживается. Выбери CSV, XLSX, PDF, JSON, JPG или PNG.');
 state.stage=(result.rows||[]).map(x=>({...x,selected:true}));state.stageWarnings=result.notes||[];renderSourcePreview(state.stagePreviewUrl,file,preview);renderStage();setImportStatus(`Прочитано: ${file.name} · ${result.method} · найдено записей: ${state.stage.length}${state.stageWarnings.length?' · есть замечания':''}`)
 }catch(err){console.error(err);setImportStatus(err.message||String(err),true);$('importWork').hidden=true}}
function applyStage(){const selected=state.stage.filter(r=>r.selected);if(!selected.length){toast('Выбери строки для импорта');return}const invalid=selected.filter(r=>!GROUPS.includes(r.group)||!r.date||r.number<1||r.number>8||!r.subject);if(invalid.length){setImportStatus(`Не удалось перенести: ${invalid.length} строк содержат неизвестную группу, дату, пару или пустой предмет. Исправь выделенные строки в предпросмотре.`,true);return}
 const outside=selected.filter(r=>r.date<state.active||r.date>addDays(state.active,5));if(outside.length){setImportStatus(`В файле есть ${outside.length} записей вне выбранной недели ${yearRange(state.active)}. Переключи неделю или исправь дату.`,true);return}
 const bucket=new Map();for(const r of selected){const key=`${r.group}|${r.date}|${r.number}`;if(!bucket.has(key))bucket.set(key,[]);bucket.get(key).push(r)}let overwrite=0;for(const [key] of bucket){const [group,date,slot]=key.split('|');if(ensureDay(getWeek(),group,date).some(l=>l.number===Number(slot)))overwrite++}
 if(overwrite&&!confirm(`Импорт затрагивает ${overwrite} занятых слотов. Существующие занятия в этих слотах будут ЗАМЕНЕНЫ, остальные группы и пары сохранятся. Продолжить?`))return;
 for(const [key,rows] of bucket){const [group,date,slotText]=key.split('|'),number=Number(slotText),list=ensureDay(getWeek(),group,date);for(let i=list.length-1;i>=0;i--)if(list[i].number===number)list.splice(i,1);
 let l;if(rows.length===1){const r=rows[0];l={id:randId(group,date,number),number,kind:r.kind,subject:r.subject,room:r.room||null,teacher:r.teacher||null};if(r.kind==='split'&&r.variants)l.variants=r.variants}
 else{const variants=rows.map(r=>({subject:r.subject,teacher:r.teacher,room:r.room}));l={id:randId(group,date,number),number,kind:'split',subject:variants.map(v=>v.subject).join(' / '),teacher:variants.map(v=>v.teacher).join(' / '),room:variants.map(v=>v.room).join(' / '),variants}}
 list.push(normalizeLesson(l,group,date,number-1));list.sort((a,b)=>a.number-b.number)}markDirty();buildLists();renderGrid();const issues=runChecks(false);setImportStatus(`В черновик перенесено ${selected.length} строк (${bucket.size} слотов). Проверка: ${issues.filter(i=>i.level==='error').length} критических конфликтов, ${issues.filter(i=>i.level==='warning').length} предупреждений.`);toast('Импорт выполнен в черновик, без публикации')}
function downloadCsv(){const csv=['Дата;Группа;Пара;Предмет;Преподаватель;Класс;Тип','23.11.2026;304;1;Самоподготовка;;;self_study','23.11.2026;304;2;Воздушная навигация;Якунин;41;lesson'].join('\r\n');exportFile('obrazec-raspisaniya.csv','\uFEFF'+csv,'text/csv;charset=utf-8')}
function setupEvents(){for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>setTab(b.dataset.tab));$('weekSelect').addEventListener('change',()=>switchWeek($('weekSelect').value));$('courseSelect').addEventListener('change',()=>{state.course=Number($('courseSelect').value);renderGrid()});$('daySelect').addEventListener('change',()=>{state.day=Number($('daySelect').value);renderGrid()});$('addSlotBtn').onclick=()=>{const grid=$('scheduleGrid'),slots=grid.tBodies[0].rows.length;openLesson(weekGroups()[0],Math.min(slots+1,8),null)};
 $('newWeekBtn').onclick=()=>{$('newWeekDate').value=addDays(state.active,7);$('newWeekDialog').showModal()};$('newWeekForm').onsubmit=createWeek;$('closeNewWeekBtn').onclick=$('cancelNewWeekBtn').onclick=()=>$('newWeekDialog').close();$('lessonForm').onsubmit=saveLesson;$('lessonForm').addEventListener('input',renderRoomHint);$('lessonForm').addEventListener('change',renderRoomHint);$('lessonKind').onchange=adjustKind;
 $('fillSubjectSuggestion').onclick=()=>fillSuggestion($('lessonSubject'),$('lessonTeacher'),$('lessonRoom'));
 $('splitFieldRows').addEventListener('click',e=>{const btn=e.target.closest('[data-fill-v]');if(!btn)return;const i=btn.dataset.fillV,find=f=>$('splitFieldRows').querySelector(`[data-v="${i}"][data-f="${f}"]`);fillSuggestion(find('subject'),find('teacher'),find('room'))});$('closeLessonBtn').onclick=$('cancelLessonBtn').onclick=closeLesson;$('deleteLessonBtn').onclick=delLesson;
 $('exportJsonBtn').onclick=exportWeek;$('exportManifestBtn').onclick=exportManifest;$('validateBtn').onclick=()=>setTab('checks');$('recheckBtn').onclick=()=>runChecks(true);$('downloadCsvBtn').onclick=downloadCsv;
 $('loadJsonBtn').onclick=()=>{const chooser=document.createElement('input');chooser.type='file';chooser.accept='.json';chooser.onchange=async()=>{if(!chooser.files?.[0])return;try{await importJsonFile(chooser.files[0])}catch(err){toast('Ошибка JSON: '+err.message)}};chooser.click()};
 $('pickFileBtn').onclick=()=>{$('docFile').click()};$('docFile').onchange=()=>{const f=$('docFile').files?.[0];if(f)importDocument(f)};$('clearStageBtn').onclick=()=>{state.stage=[];state.stageWarnings=[];$('importWork').hidden=true;setImportStatus('Предыдущий импорт очищен')};$('applyStageBtn').onclick=applyStage;
 const zone=$('dropzone');zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('docFile').click()}};for(const evt of ['dragenter','dragover'])zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('dragover')});for(const evt of ['dragleave','drop'])zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('dragover')});zone.addEventListener('drop',e=>{if(e.dataTransfer.files[0])importDocument(e.dataTransfer.files[0])})}
async function init(){setupEvents();try{
 const emb=$('embeddedEditorData');if(emb){const data=JSON.parse(emb.textContent);state.teachers=data.teachers.teachers||[];I18n.registerTeachers(state.teachers);state.roomPatterns=data.roomPatterns||null;state.subjectDirectory=data.subjects?.subjects||[];for(const [week,w] of Object.entries(data.weeks))state.weeks[week]=restoreDraft(w)}
 else{const [manifest,teachers,patterns,subjects]=await Promise.all([fetch('../data/weeks/manifest.json').then(r=>{if(!r.ok)throw new Error('manifest.json не найден');return r.json()}),fetch('../data/teachers.json').then(r=>r.json()),fetch('../data/room-patterns.json').then(r=>{if(!r.ok)throw new Error('room-patterns.json не найден');return r.json()}),fetch('../data/subjects.json').then(r=>{if(!r.ok)throw new Error('subjects.json не найден');return r.json()})]);state.teachers=teachers.teachers||[];I18n.registerTeachers(state.teachers);state.roomPatterns=patterns;state.subjectDirectory=subjects.subjects||[];for(const info of manifest){const w=await fetch('../'+info.file).then(r=>{if(!r.ok)throw new Error('Нет '+info.file);return r.json()});state.weeks[w.weekStart]=restoreDraft(w)}}
 state.active=Object.keys(state.weeks).sort().at(-1);if(!state.active)throw new Error('Не загружено ни одной учебной недели');state.day=0;populateWeeks();populateDay();buildLists();renderGrid();runChecks(false);$('dirtyBadge').textContent='Готово к редактированию';state.initialized=true
 }catch(err){console.error(err);$('storageStatus').textContent='Ошибка загрузки недель: '+err.message+' · Открой редактор через GitHub Pages или локальный HTTP-сервер.';toast('Не удалось загрузить исходные данные')}}
window.addEventListener('raspissanie-language-change',()=>{if(!state.initialized)return;populateWeeks();populateDay();buildLists();renderGrid();runChecks(false);renderRoomHint();if(state.mode==='import'&&state.stage.length)renderStage()});
init();
})();
