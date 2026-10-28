"use client";
import { useState, useTransition } from "react";
import Link from "@/components/NavigationLink";
import { CollectionProductPicker } from "./CollectionProductPicker";
import {
  saveProductComplementsAction,
  saveProductGroupsAction,
} from "@/features/collections/collections.actions";
import type { ProductOption } from "@/features/collections/collections.types";
export function ProductCollections({
  productId,
  groups,
  targets,
  products,
}: {
  productId: string;
  groups: { id: string; name: string; member: boolean }[];
  targets: string[];
  products: ProductOption[];
}) {
  const [groupIds, setGroupIds] = useState(
    groups.filter((g) => g.member).map((g) => g.id),
  );
  const [savedGroups, setSavedGroups] = useState(groupIds);
  const [ids, setIds] = useState(targets);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <section className="adminCard adminForm">
      <h2>المجموعات والمنتجات المكمّلة</h2>
      <p>اختاري مجموعات المنتج؛ ويمكن ترتيب موضعه داخل كل مجموعة من محرّرها.</p>
      <div className="collectionPills">
        {groups.map((group) => (
          <label className="adminCheck" key={group.id}>
            <input
              type="checkbox"
              disabled={pending}
              checked={groupIds.includes(group.id)}
              onChange={(event) =>
                setGroupIds(
                  event.target.checked
                    ? [...groupIds, group.id]
                    : groupIds.filter((id) => id !== group.id),
                )
              }
            />
            {group.name}
            <Link
              href={`/admin/collections?edit=${encodeURIComponent(group.id)}`}
            >
              تعديل
            </Link>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="adminBtn adminBtnPrimary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await saveProductGroupsAction(
                productId,
                groupIds,
                savedGroups,
              );
              setMessage(result.message);
              if (result.ok) setSavedGroups(groupIds);
            } catch {
              setMessage("تعذّر الاتصال. حاولي مجدداً.");
            }
          })
        }
      >
        حفظ المجموعات
      </button>
      <Link href="/admin/collections" className="adminBtn">
        إدارة وإضافة مجموعة
      </Link>
      <h3>يكمّل اختيارك</h3>
      <p className="adminMuted">
        اختاري حتى 8 منتجات ورتّبيها؛ نعرض حتى 4 منها للزبونة. بدون اختيارات
        نستخدم المجموعات المشتركة.
      </p>
      <CollectionProductPicker
        ids={ids}
        onChange={setIds}
        initialProducts={products}
        excludeId={productId}
        max={8}
        disabled={pending}
      />
      <button
        type="button"
        className="adminBtn adminBtnPrimary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await saveProductComplementsAction(productId, ids);
              setMessage(result.message);
            } catch {
              setMessage("تعذّر الاتصال. حاولي مجدداً.");
            }
          })
        }
      >
        {pending ? "جارٍ الحفظ…" : "حفظ المنتجات المكمّلة"}
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
