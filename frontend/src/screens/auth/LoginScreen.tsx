import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import z from "zod";
import { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.email("Email không hợp lệ!"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

type SignInFormValue = z.infer<typeof signInSchema>;

export function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const registeredEmail = searchParams.get("email") || "";

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValue>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: registeredEmail,
    },
  });

  const [isHide, setIsHide] = useState(true);
  const [resending, setResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      if (idToken) {
        // Clear hash to clean up the URL
        window.location.hash = "";
        
        setIsGoogleLoading(true);
        signInWithGoogle(idToken)
          .then((res) => {
            if (res.success) {
              const signedInUser = useAuthStore.getState().user;
              navigate(signedInUser?.role === "admin" ? "/admin" : "/");
            }
          })
          .finally(() => {
            setIsGoogleLoading(false);
          });
      }
    }
  }, [signInWithGoogle, navigate]);

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Vui lòng cấu hình VITE_GOOGLE_CLIENT_ID trong file .env!");
      return;
    }
    
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = "openid email profile";
    const nonce = Math.random().toString(36).substring(2);
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=id_token&` +
      `scope=${encodeURIComponent(scope)}&` +
      `nonce=${encodeURIComponent(nonce)}`;
      
    window.location.href = googleAuthUrl;
  };

  const handleResend = async (emailToResend?: string) => {
    const email = emailToResend || getValues("email");
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }

    try {
      setResending(true);
      await authService.resendVerification(email);
      toast.success("Verification email resent! Please check your inbox.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (data: SignInFormValue) => {
    const { email, password } = data;
    const { success, error } = await signIn(email, password);
    if (success) {
      const signedInUser = useAuthStore.getState().user;
      navigate(signedInUser?.role === "admin" ? "/admin" : "/");
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
      title="Chào mừng trở lại."
      description="Đăng nhập để tiếp tục trò chuyện và quản lý các cuộc họp của bạn."
    >
      {registered && (
        <div className="mb-6 p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail size={24} />
          </div>
          <h3 className="text-lg font-bold text-on-surface">Verify your email</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            We've sent a verification link to <span className="font-semibold text-primary">{registeredEmail}</span>. Please verify your email before signing in.
          </p>
          <button
            type="button"
            onClick={() => handleResend(registeredEmail)}
            disabled={resending}
            className="mt-1 text-sm font-bold text-primary hover:underline disabled:opacity-50 flex items-center justify-center gap-1 mx-auto"
          >
            {resending ? "Resending..." : "Resend verification email"}
          </button>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {errors.root?.serverError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center flex flex-col items-center gap-2">
            <span>{errors.root.serverError.message}</span>
            {errors.root.serverError.message === "Email not verified" && (
              <button
                type="button"
                onClick={() => handleResend()}
                disabled={resending}
                className="text-xs font-bold text-primary hover:underline disabled:opacity-50 flex items-center gap-1 mt-1"
              >
                {resending ? "Resending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}
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
            placeholder="Nhập địa chỉ email"
            type="email"
            {...register("email")}
          />

          {/* error */}
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-on-surface-variant"
            >
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-xs font-bold text-primary hover:underline"
            >
              Quên mật khẩu?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
              placeholder="••••••••"
              type={isHide ? "password" : "text"}
              {...register("password")}
            />

            {/* error */}
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
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
        </div>
        <Button
          disabled={isSubmitting}
          type="submit"
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <div className="mt-8 pt-8 border-t border-outline-variant/20 flex flex-col items-center gap-4">
        <p className="text-sm text-on-surface-variant">
          Chưa có tài khoản?
          <button
            onClick={() => {
              navigate("/signup");
            }}
            className="text-primary font-bold hover:underline ml-1"
          >
            Đăng ký
          </button>
        </p>
        <div className="flex gap-4 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isSubmitting}
            className="flex-1 h-12 rounded-full border-outline-variant/40 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors group disabled:opacity-50"
          >
            <div className="w-5 h-5 bg-on-surface-variant group-hover:bg-primary rounded-full transition-colors" />
            <span className="text-sm font-semibold text-on-surface">
              {isGoogleLoading ? "Connecting..." : "Google"}
            </span>
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
