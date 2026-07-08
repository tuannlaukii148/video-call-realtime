import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import z from "zod";
import { useState } from "react";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email is not valid!"),
});

type ForgotPasswordValue = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValue>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordValue) => {
    try {
      await authService.forgotPassword(data.email);
      setSuccess(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      setError("root.serverError", {
        message: error.response?.data?.message || "Failed to send reset email.",
      });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-xl text-center flex flex-col items-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest text-green-500">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface mb-3">Check your email</h1>
          <p className="text-sm text-on-surface-variant leading-6 mb-6 leading-relaxed">
            If the account exists, we have sent a password reset link to your email. Please check your inbox and follow the instructions.
          </p>
          <Button
            onClick={() => navigate("/signin")}
            className="w-full h-12 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Reset Password."
      description="Enter your email address below and we'll send you a link to reset your password."
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {errors.root?.serverError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
            {errors.root.serverError.message}
          </div>
        )}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-on-surface-variant px-1"
          >
            Email Address
          </label>
          <Input
            id="email"
            className="h-14 rounded-xl border-none bg-surface-container-highest text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="hello@digitalhearth.com"
            type="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <Button
          disabled={isSubmitting}
          type="submit"
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Sending Link...
            </>
          ) : (
            "Send Reset Link"
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
