import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { CheckCircle2, MailWarning, Loader2 } from "lucide-react";
import { authService } from "@/services/authService";

type Status = "loading" | "success" | "error";

export function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (hasVerifiedRef.current) {
        return;
      }

      if (!token) {
        setStatus("error");
        setMessage("Missing verification token.");
        return;
      }

      try {
        hasVerifiedRef.current = true;
        const response = await authService.verifyEmail(token);
        setStatus("success");
        setMessage(response.message || "Email verified successfully.");
      } catch (error: any) {
        hasVerifiedRef.current = false;
        setStatus("error");
        setMessage(error?.response?.data?.message || "Verification failed.");
      }
    };

    run();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest">
          {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="h-8 w-8 text-green-500" />}
          {status === "error" && <MailWarning className="h-8 w-8 text-amber-500" />}
        </div>

        <h1 className="text-2xl font-extrabold text-on-surface mb-3">
          {status === "success" ? "Email Verified" : status === "error" ? "Verification Failed" : "Verifying Email"}
        </h1>

        <p className="text-sm text-on-surface-variant leading-6 mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <Link
            to="/signin"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full border border-outline-variant/30 px-5 font-semibold text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
