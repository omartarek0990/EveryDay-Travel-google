import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { BrandLogo } from '../../components/BrandLogo';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { validatePasswordStrength } from '../../shared/schemas';

export function AdminLoginPage() {
  const { user, needsSetup, loading, login, setupOwner } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = needsSetup ? 'إعداد حساب المالك | everyDay' : 'تسجيل الدخول | everyDay';
  }, [needsSetup]);

  if (!loading && user) {
    return <Navigate to={user.mustChangePassword ? '/admin/account' : '/admin'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (needsSetup) {
      if (password !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين');
        return;
      }
      const pwErr = validatePasswordStrength(password, username);
      if (pwErr) {
        setError(pwErr);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (needsSetup) {
        await setupOwner(username.trim().toLowerCase(), password);
        toast.success('تم إنشاء حساب المالك وتسجيل الدخول');
      } else {
        await login(username.trim().toLowerCase(), password);
        toast.success('تم تسجيل الدخول بنجاح');
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-surface-alt flex flex-col items-center justify-center p-4">
      <Toaster position="top-center" dir="rtl" richColors />

      <div className="w-full max-w-md rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        <div className="bg-brand-600 px-6 py-6 flex items-center justify-between">
          <BrandLogo size="md" />
          <span className="text-xs font-semibold text-white/90">لوحة التحكم</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-xl font-extrabold text-ink">
              {needsSetup ? 'إعداد حساب المالك لأول مرة' : 'تسجيل دخول المالك'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {needsSetup
                ? 'أنشئ اسم المستخدم وكلمة مرور قوية (10 أحرف على الأقل) لحماية لوحة التحكم.'
                : 'أدخل بيانات حسابك لإدارة الرحلات والمحتوى.'}
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-ink">اسم المستخدم</label>
            <input
              type="text"
              dir="ltr"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="omar"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-ink">كلمة المرور</label>
            <input
              type="password"
              dir="ltr"
              required
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </div>

          {needsSetup && (
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">تأكيد كلمة المرور</label>
              <input
                type="password"
                dir="ltr"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>{needsSetup ? 'إنشاء حساب المالك والدخول' : 'تسجيل الدخول'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
