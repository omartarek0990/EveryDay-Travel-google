import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { BrandLogo } from '../../components/BrandLogo';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { validatePasswordStrength } from '../../shared/schemas';

export function AdminResetPage() {
  const { needsSetup, recoveryConfigured, loading, user, resetAccount } = useAdminAuth();
  const navigate = useNavigate();
  const [recoveryCode, setRecoveryCode] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'إعادة تعيين حساب المالك | EveryDay';
  }, []);

  if (!loading && needsSetup) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف إنجليزية أو أرقام على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    const pwErr = validatePasswordStrength(newPassword, cleanUsername);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    setSubmitting(true);
    try {
      await resetAccount({
        recoveryCode: recoveryCode.trim(),
        username: cleanUsername,
        newPassword,
      });
      toast.success('تمت إعادة تعيين اسم المستخدم وكلمة المرور بنجاح');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة تعيين الحساب');
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
          <span className="text-xs font-semibold text-white/90">استرداد الحساب</span>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-xl font-extrabold text-ink">
              إعادة تعيين اسم المستخدم وكلمة المرور
            </h1>
            <p className="mt-1 text-sm text-muted">
              استخدم رمز الاسترداد لتعيين اسم مستخدم جديد وكلمة مرور قوية للوحة المالك.
            </p>
          </div>

          {!loading && !recoveryConfigured ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2.5 text-sm text-amber-950">
              <p className="font-bold">لم يتم تعيين رمز الاسترداد على الخادم بعد</p>
              <p className="leading-relaxed text-amber-900">
                لحماية لوحة التحكم، أضف متغير البيئة{' '}
                <code dir="ltr" className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-xs">
                  OWNER_RECOVERY_CODE
                </code>{' '}
                في إعدادات المشروع على Vercel أو في بيئة التشغيل ثم أعد المحاولة.
              </p>
              {user && (
                <p className="pt-1 text-amber-900">
                  وبما أنك مسجّل الدخول حالياً، يمكنك تعديل اسم المستخدم وكلمة المرور مباشرة من{' '}
                  <Link to="/admin/account" className="font-bold underline">
                    صفحة الحساب وكلمة المرور
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">رمز الاسترداد</label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="OWNER_RECOVERY_CODE"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">اسم المستخدم الجديد</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="owner"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
                />
                <p className="text-xs text-muted">
                  10 أحرف على الأقل، ولا تحتوي على اسم المستخدم أو كلمات شائعة.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-ink">
                  تأكيد كلمة المرور الجديدة
                </label>
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

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>حفظ البيانات الجديدة والدخول</span>
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <Link
              to={user ? '/admin/account' : '/admin/login'}
              className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{user ? 'العودة لإعدادات الحساب' : 'العودة لتسجيل الدخول'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
