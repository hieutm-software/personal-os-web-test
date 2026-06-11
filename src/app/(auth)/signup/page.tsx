"use client";

import { sendOtpAction, signupAction } from "@/lib/actions/signup";
import { setLocaleAction } from "@/lib/actions/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Globe, Monitor, Moon, Sun } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// SCHEMAS

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const detailsSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters").regex(/^[a-zA-Z0-9_]+$/, "English letters, numbers, underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type EmailForm = z.infer<typeof emailSchema>;
type DetailsForm = z.infer<typeof detailsSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Flow State
  const [step, setStep] = useState<1 | 2>(1);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Actions
  const { execute: executeSendOtp, status: otpStatus, result: otpResult } = useAction(sendOtpAction);
  const { execute: executeSignup, status: signupStatus, result: signupResult } = useAction(signupAction);

  // Forms
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const detailsForm = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { otp: "", username: "", password: "" },
  });

  // Handlers
  const onEmailSubmit = (data: EmailForm) => {
    executeSendOtp(data);
  };

  const onDetailsSubmit = (data: DetailsForm) => {
    executeSignup({
      email: verifiedEmail,
      otp: data.otp,
      username: data.username,
      password: data.password,
    });
  };

  // Listen for OTP success
  useEffect(() => {
    if (otpResult.data?.success && step === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVerifiedEmail(emailForm.getValues("email"));
      setStep(2);
    }
  }, [otpResult.data, step, emailForm]);

  // Listen for Signup success
  useEffect(() => {
    if (signupResult.data?.success) {
      setTimeout(() => {
        router.push("/login?signup=success");
      }, 1500);
    }
  }, [signupResult.data, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Dynamic background element for premium feel */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />



      {/* Main Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl z-10 transition-all duration-300">
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {step === 1 ? "Create an account" : "Verify your email"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1 ? "Enter your email to get started" : `We sent a code to ${verifiedEmail}`}
          </p>
        </div>

        {/* ----------------- STEP 1: EMAIL ----------------- */}
        {step === 1 && (
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-1.5">
              <input
                {...emailForm.register("email")}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Email address (you@example.com)"
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {emailForm.formState.errors.email && (
                <p className="text-xs font-medium text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {otpResult.data?.failure && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {otpResult.data.failure}
              </div>
            )}

            <button
              type="submit"
              disabled={otpStatus === "executing"}
              className="mt-6 flex w-full justify-center items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
            >
              {otpStatus === "executing" ? "Sending code..." : "Send Verification Code"}
            </button>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline transition-all">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- STEP 2: DETAILS ----------------- */}
        {step === 2 && (
          <form onSubmit={detailsForm.handleSubmit(onDetailsSubmit)} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            
            <div className="space-y-1.5">
              <input
                {...detailsForm.register("otp")}
                id="otp"
                type="text"
                maxLength={6}
                placeholder="Verification Code"
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-center text-lg tracking-[0.5em] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {detailsForm.formState.errors.otp && (
                <p className="text-xs font-medium text-destructive">
                  {detailsForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                {...detailsForm.register("username")}
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Username (e.g. cooluser123)"
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {detailsForm.formState.errors.username && (
                <p className="text-xs font-medium text-destructive">
                  {detailsForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                {...detailsForm.register("password")}
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {detailsForm.formState.errors.password && (
                <p className="text-xs font-medium text-destructive">
                  {detailsForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {signupResult.data?.failure && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {signupResult.data.failure}
              </div>
            )}

            {signupResult.data?.success && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm font-medium text-green-600 dark:text-green-400">
                Account created successfully! Redirecting...
              </div>
            )}

            <button
              type="submit"
              disabled={signupStatus === "executing" || signupResult.data?.success}
              className="mt-6 flex w-full justify-center items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
            >
              {signupStatus === "executing" ? "Creating Account..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-2 flex w-full justify-center items-center gap-2 rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
