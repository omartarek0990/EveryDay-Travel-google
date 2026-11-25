import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { validatePasswordStrength } from '../../shared/schemas';

export function AdminAccountPage() {
  const { user, updateAccount } = useAdminAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
      toast.error('اسم المستخدم يجب أن يكون 3 أحرف إنجليزية أو أرقام على الأقل');
      return;
    }

    const wantsPasswordChange = newPassword.trim().length > 0;
    const wantsUsernameChange = cleanUsername !== (user?.username || '');

    if (!wantsPasswordChange && !wantsUsernameChange) {
      toast.error('قم بتغيير اسم المستخدم أو إدخال كلمة مرور جديدة');
      return;
    }

    if (wantsPasswordChange) {
      if (newPassword !== confirmPassword) {
        toast.error('كلمتا المرور غير متطابقتين');
        return;
      }
      const err = validatePasswordStrength(newPassword, cleanUsername);
      if (err) {
        toast.error(err);
        return;
      }
    }

    setSaving(true);
    try {
      await updateAccount({
        currentPassword,
        username: wantsUsernameChange ? cleanUsername : undefined,
        newPassword: wantsPasswordChange ? newPassword : undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('تم تحديث بيانات الحساب وإغلاق أي جلسات أخرى بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث بيانات الحساب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="الحساب وكلمة المرور"
      subtitle="تحديث اسم المستخدم وكلمة مرور المالك"
    >
      {user?.mustChangePassword && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 font-medium">
          تم إعادة تعيين كلمة المرور بواسطة كلمة مرور مؤقتة. يرجى تعيين كلمة مرور جديدة الآن للمتابعة.
        </div>
      )}

      <div className="max-w-lg rounded-2xl bg-surface border border-border p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              dir="ltr"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              يقبل حروفاً إنجليزية صغيرة وأرقاماً وعلامات (. _ -).
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              كلمة المرور الحالية <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              dir="ltr"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              كلمة المرور الجديدة (اختياري إذا كنت تعدّل اسم المستخدم فقط)
            </label>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              10 أحرف على الأقل، ولا تحتوي على اسم المستخدم أو كلمات شائعة.
            </p>
          </div>

          {newPassword.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">
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
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>حفظ التغييرات</span>
          </button>
        </form>

        <div className="pt-5 border-t border-border flex items-center justify-between gap-4 text-xs text-muted">
          <span>تحتاج لصفحة استرداد الحساب عند نسيان كلمة المرور؟</span>
          <Link to="/admin/reset" className="font-semibold text-brand-600 hover:text-brand-700 shrink-0">
            صفحة إعادة التعيين
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
