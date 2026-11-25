import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { validatePasswordStrength } from '../../shared/schemas';

export function AdminAccountPage() {
  const { user, changePassword } = useAdminAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    const err = validatePasswordStrength(newPassword, user?.username);
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('تم تحديث كلمة المرور وإغلاق أي جلسات أخرى');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="الحساب وكلمة المرور"
      subtitle="تحديث كلمة مرور المالك (10 أحرف على الأقل)"
    >
      {user?.mustChangePassword && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 font-medium">
          تم إعادة تعيين كلمة المرور بواسطة كلمة مرور مؤقتة. يرجى تعيين كلمة مرور جديدة الآن للمتابعة.
        </div>
      )}

      <div className="max-w-lg rounded-2xl bg-surface border border-border p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              dir="ltr"
              disabled
              value={user?.username || ''}
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              كلمة المرور الحالية
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
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              dir="ltr"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              10 أحرف على الأقل، ولا تحتوي على اسم المستخدم أو كلمات شائعة.
            </p>
          </div>

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
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>حفظ كلمة المرور الجديدة</span>
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
