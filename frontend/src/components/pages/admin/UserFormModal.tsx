import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, Loader2, Mail, Lock, User, Shield } from "lucide-react";
import { adminService, AdminUser } from "@/services/adminService";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const isEdit = !!user;

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user",
    email_verified: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: "", // empty so it won't change unless typed
        role: user.role || "user",
        email_verified: user.email_verified,
      });
      setError("");
    } else if (isOpen) {
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "user",
        email_verified: false,
      });
      setError("");
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      setError("Vui lòng nhập họ tên và email.");
      return;
    }

    if (!isEdit && !formData.password) {
      setError("Mật khẩu là bắt buộc khi tạo người dùng mới.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isEdit) {
        // Build payload, omit password if empty
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        
        await adminService.updateUser(user!._id, payload);
      } else {
        await adminService.createUser(formData);
      }
      onSuccess(); // Triggers re-fetch and closes modal
    } catch (err: any) {
      setError(err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="bg-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
                <h2 className="text-xl font-bold text-on-surface">
                  {isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                {error && (
                  <div className="p-3 rounded-xl bg-error/10 text-error text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Họ và tên
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                    placeholder="email@example.com"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                    placeholder={isEdit ? "Bỏ trống nếu không muốn đổi" : "Nhập mật khẩu..."}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
                      <Shield className="w-4 h-4" /> Phân quyền
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface appearance-none"
                    >
                      <option value="user">Người dùng (User)</option>
                      <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                  </div>

                  {/* Verified */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1.5">
                      Xác thực
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
                      <input
                        type="checkbox"
                        checked={formData.email_verified}
                        onChange={(e) => setFormData({ ...formData, email_verified: e.target.checked })}
                        className="w-4 h-4 text-primary rounded border-outline-variant/30 focus:ring-primary"
                      />
                      <span className="text-sm text-on-surface">Đã xác thực</span>
                    </label>
                  </div>
                </div>

              </form>

              {/* Footer */}
              <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3 bg-surface-container-lowest/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEdit ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
