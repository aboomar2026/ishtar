'use client';
import { useState } from 'react';
import Link from 'next/link';
export function EnrichmentPanel(){
  const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [results,setResults]=useState<{name:string;slug:string;result:string}[]>([]);
  async function run(){
    let items:unknown[];setError('');
    try{const data:unknown=JSON.parse(text);items=Array.isArray(data)?data:[data];if(!items.length||items.length>200)throw new Error();}catch{setError('أدخل بيانات JSON صالحة.');return;}
    setBusy(true);setResults([]);
    try{
      for(const item of items){const media=typeof item==='object'&&item!==null&&'mode' in item&&item.mode==='media';const res=await fetch(media?'/admin/api/catalog-media':'/admin/api/catalog-enrichment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'تعذر الحفظ.');setResults(prev=>[...prev,data]);}
      setText('');
    }catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ.');}finally{setBusy(false);}
  }
  return <main className="space-y-5 p-6" dir="rtl"><h1 className="text-2xl font-semibold">استكمال محتوى الكتالوج</h1>
    <p>تحديث المحتوى والربط والمجموعات مع حماية التعديلات المتزامنة. الصور والمخزون محفوظان.</p>
    <a href="/admin/api/catalog-enrichment" download="ishtar-catalog-current.json" className="inline-block rounded border p-3">تنزيل الكتالوج الحالي</a>
    <label htmlFor="enrichment-data">بيانات التحديث</label><textarea id="enrichment-data" rows={8} wrap="off" spellCheck={false} value={text} onChange={e=>setText(e.target.value)} disabled={busy} className="block w-full rounded border p-3 font-mono text-xs" dir="ltr"/>
    <button type="button" disabled={busy||!text.trim()} onClick={run} className="rounded bg-[#582e42] px-5 py-3 text-white disabled:opacity-50">{busy?'جارٍ حفظ التحديثات…':'تطبيق تحديثات الكتالوج'}</button>
    <p role="status">{busy?`تم حفظ ${results.length} — جارٍ المتابعة…`:results.length?`اكتمل: ${results.length}`:''}</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <ul>{results.map((r,i)=><li key={i}>{r.name} — تم الحفظ <Link href={r.result==='collection'?`/collections/${r.slug}`:`/product/${r.slug}`}>معاينة</Link></li>)}</ul>
  </main>;
}
