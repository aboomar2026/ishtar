import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { hasAdminPermission } from '@/features/admin/auth/admin-permissions';
import { prisma } from '@/lib/prisma';
import { enrichmentSchema } from '@/features/admin/products/catalog-enrichment.validation';
import { applyCatalogEnrichment, CatalogConflict } from '@/features/admin/products/catalog-enrichment';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
async function authorized(){const s=await getAdminSession();return s&&hasAdminPermission(s.role,'catalog');}
export async function GET(){
  if(!await authorized())return NextResponse.json({error:'يلزم تسجيل الدخول.'},{status:401});
  const [products,collections]=await Promise.all([
    prisma.product.findMany({where:{deletedAt:null},include:{category:true,images:{orderBy:{sortOrder:'asc'}},variants:true,complements:true,collections:true},orderBy:{slug:'asc'}}),
    prisma.collection.findMany({include:{products:true}})
  ]);
  return NextResponse.json({products,collections},{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="ishtar-catalog-current.json"'}});
}
export async function POST(request:Request){
  if(!await authorized())return NextResponse.json({error:'يلزم تسجيل الدخول.'},{status:401});
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
  const text=await request.text();if(Buffer.byteLength(text)>100000)return NextResponse.json({error:'بيانات أكبر من الحد المسموح.'},{status:413});
  let raw:unknown;try{raw=JSON.parse(text);}catch{return NextResponse.json({error:'JSON غير صالح.'},{status:400});}
  const parsed=enrichmentSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'راجع بيانات التحديث.',fields:parsed.error.issues.map(i=>i.path.join('.'))},{status:400});
  try{
    const result=await applyCatalogEnrichment(parsed.data);
    for(const p of ['/','/collections','/admin/products','/admin/collections','/admin/categories','/category/all','/category/new-in','/category/sale','/category/featured',...result.categorySlugs.map(s=>`/category/${s}`),parsed.data.mode==='product'?`/product/${result.slug}`:`/collections/${result.slug}`])revalidatePath(p);
    return NextResponse.json({ok:true,...result});
  }catch(error){return NextResponse.json({error:error instanceof CatalogConflict?error.message:'تعذر حفظ التحديث؛ لم تُعتمد تغييرات جزئية.'},{status:error instanceof CatalogConflict?409:500});}
}
