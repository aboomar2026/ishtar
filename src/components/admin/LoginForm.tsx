'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, type LoginState } from '@/features/admin/auth/admin-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="adminBtn adminBtnPrimary adminBtnFull" disabled={pending}>
      {pending ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="adminForm">
      {state.error && (
        <div className="adminAlert isError" role="alert">
          {state.error}
        </div>
      )}
      <div className="adminField">
        <label htmlFor="admin-email">البريد الإلكتروني</label>
        <input id="admin-email" name="email" type="text" autoComplete="username" autoFocus required placeholder="admin" />
      </div>
      <div className="adminField">
        <label htmlFor="admin-password">كلمة المرور</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
      </div>
      <SubmitButton />
    </form>
  );
}
