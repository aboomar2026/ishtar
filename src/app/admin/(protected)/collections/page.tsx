import { requireAdmin } from "@/features/admin/auth/admin-auth";
import { collectionsReady } from "@/features/collections/collections.queries";
import {
  getCollectionEditors,
  productOptions,
} from "@/features/collections/collections.admin";
import { CollectionManager } from "@/components/admin/CollectionManager";
export const dynamic = "force-dynamic";
export default async function CollectionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  if (!(await collectionsReady()))
    return (
      <div className="adminCard">
        <h1>المجموعات</h1>
        <p>
          الإعداد غير مكتمل. طبّقي ملف prisma/additive/collections.sql في SQL
          Editor على سوبابيس، ثم أعيدي تحميل الصفحة. لا تتغير المنتجات أو
          المخزون.
        </p>
      </div>
    );
  const collections = await getCollectionEditors();
  const ids = [
    ...new Set(collections.flatMap((collection) => collection.productIds)),
  ];
  const products = (
    await Promise.all(
      Array.from({ length: Math.ceil(ids.length / 200) }, (_, index) =>
        productOptions("", ids.slice(index * 200, (index + 1) * 200)),
      ),
    )
  ).flat();
  return (
    <div>
      <div className="adminPageHeader">
        <h1>إدارة المجموعات</h1>
      </div>
      <CollectionManager
        collections={collections}
        products={products}
        initialEdit={(await searchParams).edit}
      />
    </div>
  );
}
