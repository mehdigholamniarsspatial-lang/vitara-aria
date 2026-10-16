import {vitaminById} from './data.js';
export const normalize = text => String(text).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200f\u200e]/g,' ').toLowerCase().trim();
export const parseNumber = value => Number(String(value).trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g,'.'));
export function validateProfile(p) {
 if (!Number.isInteger(p.age) || p.age < 19 || p.age > 120) throw new Error('سن معتبر بین ۱۹ تا ۱۲۰ سال وارد کنید. محاسبات کودکان در این نسخه پشتیبانی نمی‌شود.');
 if (!['male','female'].includes(p.sex)) throw new Error('گروه مرجع را انتخاب کنید.');
 if (!['ordinary','pregnancy','lactation'].includes(p.stage)) throw new Error('وضعیت فیزیولوژیک معتبر نیست.');
 if (p.stage !== 'ordinary' && (p.sex !== 'female' || p.age > 50)) throw new Error('جدول بارداری و شیردهی این نسخه فقط برای گروه زنان ۱۹ تا ۵۰ سال پیاده‌سازی شده است.');
 return true;
}
export function referenceFor(id,p) {
 validateProfile(p); const v=vitaminById[id]; if(!v) throw new Error('ویتامین ناشناخته است.');
 let amount=v.reference[p.stage==='pregnancy'?2:p.stage==='lactation'?3:p.sex==='male'?0:1];
 if(p.stage==='ordinary' && id==='D' && p.age>70) amount=20;
 if(p.stage==='ordinary' && id==='B6' && p.age>50) amount=p.sex==='male'?1.7:1.5;
 if(id==='C' && p.smoker) amount+=35;
 return {amount,unit:v.unit,type:v.type,source:v.source};
}
export function manualEntry(id,{amount,unit,kind,form='known',label='ورودی دستی'}) {
 const v=vitaminById[id]; if(!v)throw new Error('ویتامین ناشناخته است.');
 const n=parseNumber(amount); if(!String(amount).trim() || !Number.isFinite(n)||n<0||n>1e8)throw new Error('مقدار باید عددی نامنفی و معتبر باشد.');
 if(!['food','supplement','fortified'].includes(kind))throw new Error('نوع منبع معتبر نیست.');
 if(unit!==(id==='B9'&&kind!=='food'?'mcg folic acid':v.unit) && !(id==='D' && unit==='IU')) throw new Error('واحد با ویتامین انتخاب‌شده سازگار نیست.');
 let value=id==='D'&&unit==='IU'?n/40:n;
 let ulAmount=v.ulScope==='total'?value:v.ulScope==='none'?0:kind==='food'?0:value;
 if(id==='A') {
  if(!['preformed','carotenoid','unknown'].includes(form))throw new Error('شکل ویتامین A را انتخاب کنید.');
  ulAmount=form==='preformed'?value:form==='carotenoid'?0:null;
 }
 if(id==='B9' && kind!=='food') {if(form!=='folicWithFood')throw new Error('فقط اسیدفولیک همراه غذا در تبدیل مکمل فولات پشتیبانی می‌شود.');value=n/0.6;ulAmount=n;}
 return {id:globalThis.crypto?.randomUUID?.()||`item-${Date.now()}-${Math.random()}`,vitamin:id,label:String(label).slice(0,100),amount:value,ulAmount,kind,inputAmount:n,inputUnit:unit,form,source:'اطلاعات واردشده توسط کاربر؛ صحت برچسب باید بررسی شود.'};
}
export function foodEntry(id,foodId,servings) {
 const v=vitaminById[id], f=v?.foods.find(x=>x.id===foodId), n=parseNumber(servings);
 if(!f||!Number.isFinite(n)||n<=0||n>100)throw new Error('تعداد سهم باید بیشتر از صفر و حداکثر ۱۰۰ باشد.');
 return {id:globalThis.crypto?.randomUUID?.()||`food-${Date.now()}-${Math.random()}`,vitamin:id,label:f.name,amount:f.amount*n,ulAmount:f.ulAmount*n,kind:'food',servings:n,serving:f.serving,source:v.source};
}
export function assess(id,p,allEntries) {
 const v=vitaminById[id], ref=referenceFor(id,p), entries=allEntries.filter(e=>e.vitamin===id);
 for(const e of entries)if(!Number.isFinite(e.amount)||e.amount<0||!(e.ulAmount===null||Number.isFinite(e.ulAmount)&&e.ulAmount>=0))throw new Error('داده دریافت نامعتبر است.');
 const total=entries.reduce((s,e)=>s+e.amount,0), ulTotal=entries.reduce((s,e)=>s+(e.ulAmount??0),0);
 const incompleteUL=entries.some(e=>e.ulAmount===null), over=v.ul!==null&&ulTotal>v.ul;
 const level=!entries.length?'empty':over?'over':total<ref.amount?'below':'reference';
 return {total,ref,percent:total/ref.amount*100,ul:v.ul,ulTotal,incompleteUL,over,level,entries:entries.length,efsaB6:id==='B6'&&total>12};
}
export function safeSnapshot(value) {
 if(!value||value.version!==1||!Array.isArray(value.entries)||value.entries.length>1000)throw new Error('فایل پشتیبان معتبر نیست.');
 validateProfile(value.profile);
 const entries=value.entries.map(e=>{
  if(!vitaminById[e.vitamin]||!['food','supplement','fortified'].includes(e.kind)||typeof e.label!=='string'||e.label.length>100||!Number.isFinite(e.amount)||e.amount<0||e.amount>1e8||!(e.ulAmount===null||Number.isFinite(e.ulAmount)&&e.ulAmount>=0&&e.ulAmount<=1e8))throw new Error('ردیف نامعتبر در فایل پشتیبان.');
  return {id:globalThis.crypto?.randomUUID?.()||`import-${Math.random()}`,vitamin:e.vitamin,label:e.label,amount:e.amount,ulAmount:e.ulAmount,kind:e.kind,source:'بازیابی از فایل کاربر؛ اعتبار علمی مقادیر باید بررسی شود.'};
 });
 return {profile:{age:value.profile.age,sex:value.profile.sex,stage:value.profile.stage,smoker:!!value.profile.smoker},entries};
}
