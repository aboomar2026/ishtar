'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCategoryAction,
  updateCategoryAction,
  setCategoryActiveAction,
  deleteCategoryAction
} from '@/features/admin/categories/category-admin.actions';
import type { AdminCategoryListItem } from '@/features/admin/categories/category-admin.queries';
import { slugify } from '@/features/admin/shared/admin-format';

type ParentOption = { id: string; name: string };

type EditorState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};

function emptyEditor(sortOrder: number): EditorState {
  return { name: '', slug: '', description: '', imageUrl: '', parentId: '', sortOrder: String(sortOrder), isActive: true };
}

export function CategoryManager({
  categories,
  parentOptions
}: {
  categories: AdminCategoryListItem[];
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openAdd() {
    setIssues({});
    setFormMessage(null);
    setSlugEdited(false);
    setEditor(emptyEditor(categories.length + 1));
  }

  function openEdit(category: AdminCategoryListItem) {
    setIssues({});
    setFormMessage(null);
    setSlugEdited(true);
    setEditor({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      sortOrder: String(category.sortOrder),
      isActive: category.isActive
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setIssues({});
    setFormMessage(null);

    const payload = {
      name: editor.name.trim(),
      slug: editor.slug.trim(),
      description: editor.description.trim() || undefined,
      imageUrl: editor.imageUrl.trim() || undefined,
      parentId: editor.parentId || undefined,
      sortOrder: Number(editor.sortOrder) || 0,
      isActive: editor.isActive
    };

    startTransition(async () => {
      const result = editor.id
        ? await updateCategoryAction(editor.id, payload)
        : await createCategoryAction(payload);
      if (result.ok) {
        setEditor(null);
        router.refresh();
      } else {
        setFormMessage(result.message);
        const map: Record<string, string> = {};
        result.issues.forEach((issue) => { map[issue.path] = issue.message; });
        setIssues(map);
      }
    });
  }

  function toggleActive(category: AdminCategoryListItem) {
    setRowError(null);
    startTransition(async () => {
      await setCategoryActiveAction(category.id, !category.isActive);
      router.refresh();
    });
  }

  function remove(category: AdminCategoryListItem) {
    setRowError(null);
    if (!window.confirm(`حذف التصنيف "${category.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) setRowError(result.message ?? 'تعذّر حذف التصنيف.');
      else router.refresh();
    });
  }

  const editorParents = parentOptions.filter((option) => option.id !== editor?.id);

  return (
    <div>
      <div className="adminCardHeader">
        <p className="adminMuted">{categories.length} تصنيف.</p>
        {!editor && <button type="button" className="adminBtn adminBtnPrimary" onClick={openAdd}>+ إضافة تصنيف</button>}
      </div>

      {rowError && <div className="adminAlert isError" style={{ marginBottom: 12 }}>{rowError}</div>}

      {editor && (
        <form className="adminCard adminForm" onSubmit={submit} style={{ marginBottom: 16 }}>
          <div className="adminCardHeader"><h2>{editor.id ? 'تعديل التصنيف' : 'تصنيف جديد'}</h2></div>
          {formMessage && <div className="adminAlert isError">{formMessage}</div>}
          <div className="adminFormGrid two">
            <div className="adminField">
              <label>الاسم *</label>
              <input className={issues.name ? 'hasError' : ''} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value, slug: slugEdited ? editor.slug : slugify(e.target.value) })} required />
              {issues.name && <span className="adminFieldError">{issues.name}</span>}
            </div>
            <div className="adminField">
              <label>الـ slug *</label>
              <input className={issues.slug ? 'hasError' : ''} value={editor.slug} onChange={(e) => { setSlugEdited(true); setEditor({ ...editor, slug: e.target.value }); }} onBlur={(e) => setEditor({ ...editor, slug: slugify(e.target.value) })} required />
              {issues.slug && <span className="adminFieldError">{issues.slug}</span>}
            </div>
            <div className="adminField spanTwo">
              <label>الوصف</label>
              <textarea value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
            </div>
            <div className="adminField">
              <label>رابط الصورة أو المسار</label>
              <input className={issues.imageUrl ? 'hasError' : ''} value={editor.imageUrl} onChange={(e) => setEditor({ ...editor, imageUrl: e.target.value })} placeholder="/mock-products/bag-camel.svg" />
              {issues.imageUrl && <span className="adminFieldError">{issues.imageUrl}</span>}
            </div>
            <div className="adminField">
              <label>التصنيف الأب</label>
              <select className={issues.parentId ? 'hasError' : ''} value={editor.parentId} onChange={(e) => setEditor({ ...editor, parentId: e.target.value })}>
                <option value="">لا شيء (مستوى أعلى)</option>
                {editorParents.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              {issues.parentId && <span className="adminFieldError">{issues.parentId}</span>}
            </div>
            <div className="adminField">
              <label>ترتيب العرض</label>
              <input type="number" min="0" step="1" value={editor.sortOrder} onChange={(e) => setEditor({ ...editor, sortOrder: e.target.value })} />
            </div>
            <div className="adminField">
              <label>&nbsp;</label>
              <label className={`adminCheck${editor.isActive ? ' isOn' : ''}`}>
                <input type="checkbox" checked={editor.isActive} onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })} /> نشط
              </label>
            </div>
          </div>
          <div className="adminBtnRow">
            <button type="submit" className="adminBtn adminBtnPrimary" disabled={pending}>{pending ? 'جارٍ الحفظ…' : editor.id ? 'حفظ التصنيف' : 'إنشاء التصنيف'}</button>
            <button type="button" className="adminBtn adminBtnGhost" disabled={pending} onClick={() => setEditor(null)}>إلغاء</button>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <div className="adminEmptyState">لا توجد تصنيفات بعد.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="adminCard adminOnlyDesktop" style={{ padding: 0 }}>
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>الاسم</th><th>الـ slug</th><th>التصنيف الأب</th><th>المنتجات</th><th>الترتيب</th><th>الحالة</th><th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td><strong>{category.name}</strong></td>
                      <td className="adminMuted">{category.slug}</td>
                      <td>{category.parentName ?? '—'}</td>
                      <td>{category.productCount}</td>
                      <td>{category.sortOrder}</td>
                      <td><span className={`adminBadge ${category.isActive ? 'isActive' : 'isArchived'}`}>{category.isActive ? 'نشط' : 'معطّل'}</span></td>
                      <td>
                        <div className="adminBtnRow">
                          <button type="button" className="adminBtn adminBtnSm" onClick={() => openEdit(category)} disabled={pending}>تعديل</button>
                          <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => toggleActive(category)} disabled={pending}>{category.isActive ? 'تعطيل' : 'تفعيل'}</button>
                          <button type="button" className="adminBtn adminBtnDanger adminBtnSm" onClick={() => remove(category)} disabled={pending || category.productCount > 0 || category.childCount > 0} title={category.productCount > 0 ? 'يحتوي على منتجات' : category.childCount > 0 ? 'يحتوي على تصنيفات فرعية' : 'حذف'}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="adminCardList adminOnlyMobile">
            {categories.map((category) => (
              <div key={category.id} className="adminRecordCard">
                <div className="adminRecordTop">
                  <div style={{ minWidth: 0 }}>
                    <strong>{category.name}</strong>
                    <div className="adminMuted" style={{ fontSize: 12 }}>{category.slug}</div>
                  </div>
                  <span className={`adminBadge ${category.isActive ? 'isActive' : 'isArchived'}`} style={{ marginInlineStart: 'auto' }}>{category.isActive ? 'نشط' : 'معطّل'}</span>
                </div>
                <div className="adminRecordMeta">
                  <span>التصنيف الأب: <b>{category.parentName ?? '—'}</b></span>
                  <span>المنتجات: <b>{category.productCount}</b></span>
                  <span>الترتيب: <b>{category.sortOrder}</b></span>
                </div>
                <div className="adminBtnRow">
                  <button type="button" className="adminBtn adminBtnSm" onClick={() => openEdit(category)} disabled={pending}>تعديل</button>
                  <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => toggleActive(category)} disabled={pending}>{category.isActive ? 'تعطيل' : 'تفعيل'}</button>
                  <button type="button" className="adminBtn adminBtnDanger adminBtnSm" onClick={() => remove(category)} disabled={pending || category.productCount > 0 || category.childCount > 0}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
