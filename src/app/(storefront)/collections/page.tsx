import type { Metadata } from "next";
import { CollectionCard } from "@/components/CollectionCard";
import { getCollections } from "@/features/collections/collections.queries";
import { publicSiteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مجموعات عشتار",
  description: "اختيارات تجمعها المناسبة والستايل؛ اكتشفي مجموعتك المفضّلة.",
  alternates: publicSiteUrl() ? { canonical: "/collections" } : undefined,
};
export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <section className="contentSection">
      <div className="collectionIntro">
        <span className="eyebrow">ISHTAR · COLLECTIONS</span>
        <h1>لكل مناسبة، اختياراتها</h1>
        <p>اكتشفي قطعاً يجمعها الستايل والاهتمام والتفاصيل التي تحبّينها.</p>
      </div>
      {collections.length ? (
        <div className="collectionGrid">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <p className="emptyState">
          نحضّر لكِ مجموعات جديدة. تصفّحي المنتجات من القائمة.
        </p>
      )}
    </section>
  );
}
