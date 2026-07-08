import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Apple, EyeOff } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // ket noi zod voi react hook form
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useState } from "react";

const signUpSchema = z
  .object({
    fullname: z.string().min(1, "Vui lòng nhập Họ tên!"),
    email: z.string().email("Email không hợp lệ!"),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không trùng khớp!",
  });

type SignUpFormValue = z.infer<typeof signUpSchema>;

export function SignupScreen() {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const [isHide, setIsHide] = useState(true);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValue>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpFormValue) => {
    const { fullname, email, password } = data;
    const { success, error } = await signUp(fullname, email, password);
    if (success) {
      navigate(`/signin?registered=true&email=${encodeURIComponent(email)}`);
    } else {
      if (error?.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          if (err.field) {
            setError(err.field as any, { message: err.message });
          }
        });
      } else if (error?.message) {
        setError("root.serverError", { message: error.message });
      }
    }
  };
  return (
    <AuthLayout
      title="Kết nối mọi người"
      description="Tạo tài khoản để bắt đầu các cuộc họp."
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {errors.root?.serverError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
            {errors.root.serverError.message}
          </div>
        )}
        <div className="space-y-2">
          <label
            htmlFor="fullname"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            Họ tên
          </label>
          <Input
            id="fullname"
            className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="Nhập tên của bạn"
            {...register("fullname")}
          />

          {/* Error */}
          {errors.fullname && (
            <p className="text-xs text-red-500">{errors.fullname.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            Email
          </label>
          <Input
            id="email"
            className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="Nhập email của bạn"
            type="email"
            {...register("email")}
          />
          {/* Error */}
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            Mật khẩu
          </label>
          <div className="relative">
            <Input
              id="password"
              className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
              placeholder="••••••••"
              type={isHide ? "password" : "text"}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
              onClick={() => {
                setIsHide((prev) => !prev);
              }}
            >
              {isHide ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {/* Error */}
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            Xác nhận mật khẩu
          </label>
          <Input
            id="confirmPassword"
            className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="••••••••"
            type={isHide ? "password" : "text"}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button
          disabled={isSubmitting}
          type="submit"
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
        </Button>
      </form>

      <div className="mt-8 pt-8 border-t border-outline-variant/20 flex flex-col items-center gap-4">
        <p className="text-sm text-on-surface-variant">
          Đã có tài khoản?
          <button
            onClick={() => {
              navigate("/signin");
            }}
            className="text-primary font-bold hover:underline ml-1"
          >
            Đăng nhập
          </button>
        </p>
        <div className="flex gap-4 w-full">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-full border-outline-variant/40 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors group"
          >
            <div className="w-5 h-5 bg-on-surface-variant group-hover:bg-primary rounded-full transition-colors" />
            <span className="text-sm font-semibold text-on-surface">
              Google
            </span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-full border-outline-variant/40 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors group"
          >
            <Apple
              size={20}
              className="text-on-surface-variant group-hover:text-primary transition-colors"
            />
            <span className="text-sm font-semibold text-on-surface">Apple</span>
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
