import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import z from "zod";
import { useState } from "react";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ResetPasswordValue = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [isHide, setIsHide] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValue>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordValue) => {
    if (!token) {
      toast.error("Missing password reset token.");
      return;
    }

    try {
      await authService.resetPassword(token, data.password);
      toast.success("Password reset successfully! Please log in.");
      navigate("/signin");
    } catch (error: any) {
      setError("root.serverError", {
        message: error.response?.data?.message || "Failed to reset password.",
      });
    }
  };

  return (
    <AuthLayout
      title="Create New Password."
      description="Please enter your new password below."
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {errors.root?.serverError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
            {errors.root.serverError.message}
          </div>
        )}

        {!token && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm text-center">
            Missing or invalid password reset token. Please request a new link.
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            New Password
          </label>
          <div className="relative">
            <Input
              id="password"
              className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
              placeholder="••••••••"
              type={isHide ? "password" : "text"}
              disabled={!token}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
              onClick={() => setIsHide((prev) => !prev)}
              disabled={!token}
            >
              {isHide ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="••••••••"
            type={isHide ? "password" : "text"}
            disabled={!token}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          disabled={isSubmitting || !token}
          type="submit"
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>

      <div className="mt-8 pt-8 border-t border-outline-variant/20 text-center">
        <button
          onClick={() => navigate("/signin")}
          className="inline-flex items-center gap-2 text-sm text-primary font-bold hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Sign In
        </button>
      </div>
    </AuthLayout>
  );
}
