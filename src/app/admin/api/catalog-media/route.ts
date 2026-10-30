import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { hasAdminPermission } from '@/features/admin/auth/admin-permissions';
import { catalogMediaSchema } from '@/features/admin/products/catalog-media.validation';
import { appendCatalogMedia } from '@/features/admin/products/catalog-media';
import { CatalogConflict } from '@/features/admin/products/catalog-enrichment';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){
  const session=await getAdminSession();
  if(!session||!hasAdminPermission(session.role,'catalog'))return NextResponse.json({error:'يلزم تسجيل الدخول.'},{status:401});
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
  const text=await request.text();
  if(Buffer.byteLength(text)>2_700_000)return NextResponse.json({error:'بيانات أكبر من الحد المسموح.'},{status:413});
  let raw:unknown;try{raw=JSON.parse(text);}catch{return NextResponse.json({error:'JSON غير صالح.'},{status:400});}
  const parsed=catalogMediaSchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'راجع بيانات الصورة.'},{status:400});
  try{
    const result=await appendCatalogMedia(parsed.data);
    for(const path of ['/','/collections','/admin/products','/category/all','/category/new-in',`/product/${result.slug}`,...result.categorySlugs.map(s=>`/category/${s}`)])revalidatePath(path);
    return NextResponse.json({ok:true,...result});
  }catch(error){
    return NextResponse.json({error:error instanceof CatalogConflict?error.message:'تعذر إضافة الصورة؛ يمكنك إعادة المحاولة بأمان.'},{status:error instanceof CatalogConflict?409:500});
  }
}
