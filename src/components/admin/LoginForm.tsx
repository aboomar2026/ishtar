'use client';

import { useActionState, useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="adminForm">
      {state.error && (
        <div className="adminAlert isError" role="alert">
          {state.error}
        </div>
      )}
      <div className="adminField">
        <label htmlFor="admin-email">البريد الإلكتروني / معرّف الدخول</label>
        <input id="admin-email" name="email" type="text" dir="ltr" autoComplete="username" autoFocus required placeholder="البريد الإلكتروني أو معرّف الدخول" />
      </div>
      <div className="adminField">
        <label htmlFor="admin-password">كلمة المرور</label>
        <input id="admin-password" name="password" type={showPassword ? "text" : "password"} dir="ltr" autoComplete="current-password" required placeholder="••••••••" />
      </div>
      <button type="button" className="adminBtn adminBtnGhost" aria-controls="admin-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}</button>
      <SubmitButton />
    </form>
  );
}
