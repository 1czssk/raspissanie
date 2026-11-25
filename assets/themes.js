/* Расписсание: shared, offline-friendly appearance preferences. */
(()=>{
 'use strict';
 const THEME_KEY='raspissanie-theme-v1', MODE_KEY='raspissanie-dark-v1';
 const themes=[
   ['standard','Стандартная','Standard'],['blue','Синяя','Blue'],['pink','Розовенькая','Pink'],
   ['glamour','Гламур','Glamour'],['petersburg','Санкт-Петербург','Saint Petersburg'],
   ['lsd','ЛСД','LSD'],['matrix','Матрица','Matrix'],['cockpit','Ночная кабина','Night cockpit'],
   ['notebook','Тетрадка','Notebook'],['ultraviolet','Ультрафиолет','Ultraviolet'],
   ['simple','Простая','Plain'],['nineties','Девяностые','The Nineties']
 ];
 const valid=new Set(themes.map(x=>x[0]));
 const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch(_){return fallback}};
 let theme=read(THEME_KEY,'standard'),dark=read(MODE_KEY,'false')==='true';
 if(!valid.has(theme))theme='standard';
 const root=document.documentElement;
 const apply=()=>{
  root.dataset.theme=theme;root.dataset.mode=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';
  const control=document.getElementById('siteTheme');if(control)control.value=theme;
  const swatch=document.getElementById('themeSwatch');if(swatch)swatch.dataset.themeSwatch=theme;
  const toggle=document.getElementById('themeToggle');if(toggle){
   toggle.setAttribute('aria-pressed',dark?'true':'false');
   toggle.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');
   toggle.title=dark?'Светлая тема':'Тёмная тема';
   toggle.innerHTML=dark?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5a8.6 8.6 0 0 1-11-11A8.8 8.8 0 1 0 20.5 14.5Z" fill="currentColor"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  }
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=getComputedStyle(root).getPropertyValue('--t-panel').trim()|| (dark?'#151923':'#ffffff');
 };
 const save=()=>{try{localStorage.setItem(THEME_KEY,theme);localStorage.setItem(MODE_KEY,String(dark))}catch(_){}};
 const local=(s)=>window.RaspI18n?.ready?.()?window.RaspI18n.localize(s):s;
 const drawSelect=()=>{
  const sel=document.getElementById('siteTheme');if(!sel)return;
  sel.innerHTML=themes.map(([id,ru,en])=>`<option value="${id}">${local(ru)}</option>`).join('');
  sel.value=theme;
  const lbl=document.getElementById('themeLabel');if(lbl)lbl.textContent=local('Тема');
 };
 const mount=()=>{
  drawSelect();
  const sel=document.getElementById('siteTheme');if(sel)sel.addEventListener('change',()=>{if(valid.has(sel.value)){theme=sel.value;save();apply();}});
  const btn=document.getElementById('themeToggle');if(btn)btn.addEventListener('click',()=>{dark=!dark;save();apply()});
  window.addEventListener('raspissanie-language-change',()=>{drawSelect()});
  apply();
 };
 apply();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.RaspThemes={getTheme:()=>theme,isDark:()=>dark,select:id=>{if(valid.has(id)){theme=id;save();apply()}},toggle:()=>{dark=!dark;save();apply()},list:themes};
})();
