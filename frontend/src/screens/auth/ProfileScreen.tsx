import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { ArrowLeft, Flame, Sparkles } from "lucide-react";
import { useEffect } from "react";

const profileSchema = z.object({
  fullName: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, updateProfile, loading, fetchProfile } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name || "",
      email: user?.email || "",
    },
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.full_name || "",
        email: user.email || "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    await updateProfile({ full_name: data.fullName });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center pt-20 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold text-sm">Quay lại Dashboard</span>
        </button>

        <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-lg relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <img src="/logo/logo.png" alt="WebCall Logo" className="w-full h-full rounded-2xl object-cover" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-on-surface">Hồ sơ của bạn</h1>
                <p className="text-sm text-on-surface-variant/70 font-medium">Quản lý thông tin cá nhân</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant px-1">
                  Họ tên
                </label>
                <Input
                  className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
                  placeholder="Họ tên của bạn"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <span className="text-error text-xs font-semibold px-1">{errors.fullName.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant px-1">
                  Email <span className="text-[10px] uppercase bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full ml-2">Chỉ Đọc</span>
                </label>
                <Input
                  disabled
                  className="h-14 rounded-xl border-none bg-surface-container-lowest text-on-surface-variant opacity-60 cursor-not-allowed font-medium"
                  {...register("email")}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant px-1">
                  Vai trò
                </label>
                <div className="h-14 rounded-xl border-none bg-surface-container-lowest text-on-surface-variant opacity-80 flex items-center px-4 font-medium capitalize">
                  {user?.role || "User"}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 mt-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                {loading ? "Đang lưu..." : "Lưu Thay Đổi"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
