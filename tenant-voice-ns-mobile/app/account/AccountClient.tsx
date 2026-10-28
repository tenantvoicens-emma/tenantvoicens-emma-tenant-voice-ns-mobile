"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import FormMessages from "@/components/ui/FormMessages";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { supabase } from "@/lib/supabase";

type AccountMode = "sign-in" | "create-account" | "recover-password";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const adminEmail = "tenantvoicens@gmail.com";

export default function AccountClient() {
  const searchParams = useSearchParams();
  const isPasswordReset = searchParams.get("mode") === "reset";
  const [mode, setMode] = useState<AccountMode>("sign-in");
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage("Could not check your sign-in status.");
      }
      setSession(data.session);
      setIsCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isActive) {
        setSession(nextSession);
        setIsCheckingSession(false);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  function changeMode(nextMode: AccountMode) {
    setMode(nextMode);
    setMessage("");
    setErrorMessage("");
    setPassword("");
    setConfirmPassword("");
    setCaptchaToken("");
    setCaptchaResetKey((key) => key + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (isPasswordReset) {
      const problem = newPasswordProblem(password, confirmPassword);
      if (problem) {
        setErrorMessage(problem);
        return;
      }

      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage("Could not update your password. Request a new reset link and try again.");
      } else {
        setPassword("");
        setConfirmPassword("");
        setMessage("Password updated. You can now use it to sign in.");
      }
      setIsSubmitting(false);
      return;
    }

    if (mode === "create-account") {
      const problem = newPasswordProblem(password, confirmPassword);
      if (problem) {
        setErrorMessage(problem);
        return;
      }
    }

    if (!captchaToken || !turnstileSiteKey || isSubmitting) {
      setErrorMessage("Complete the security check to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: { captchaToken },
        });
        if (error) {
          throw error;
        }
        setMessage("You’re signed in. Your public reviews remain anonymous.");
      } else if (mode === "create-account") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            captchaToken,
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });
        if (error) {
          throw error;
        }
        setMessage(
          data.session
            ? "Account created. Your public reviews remain anonymous."
            : "Check your email for a confirmation link. Your reviews are not public unless approved."
        );
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            captchaToken,
            redirectTo: `${window.location.origin}/account?mode=reset`,
          }
        );
        if (error) {
          throw error;
        }
        setMessage(
          "If an account exists for that email, a password reset link has been sent."
        );
      }
    } catch (error) {
      console.error("Account request failed.", error);
      setErrorMessage(
        mode === "sign-in"
          ? "Could not sign in. Check your email and password, then try again."
          : mode === "create-account"
            ? "Could not create the account. Check the details and try again."
            : "Could not send a reset link. Please try again."
      );
    } finally {
      setCaptchaToken("");
      setCaptchaResetKey((key) => key + 1);
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage("Could not sign out. Please try again.");
    } else {
      setMessage("You’re signed out.");
    }
  }

  if (isCheckingSession) {
    return <p className="text-[#66706B]" role="status">Checking sign-in status...</p>;
  }

  if (isPasswordReset) {
    return (
      <section className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">Choose a new password</h1>
          <p className="text-lg text-[#66706B]">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6">
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            isNew
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            isNew
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-full bg-[#08873A] px-5 text-lg font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
        <FormMessages message={message} errorMessage={errorMessage} />
      </section>
    );
  }

  if (session) {
    const isAdmin = session.user.email?.toLowerCase() === adminEmail;
    return (
      <section className="space-y-5">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">Your account</h1>
        <div className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6">
          <p className="text-lg text-[#4A5A52]">
            You’re signed in. Reviews you choose to submit while signed in can be
            privately linked to your account for future account features. Your
            account identity is not shown on public reviews.
          </p>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#08873A] px-5 text-lg font-medium text-white"
            >
              Open moderation queue
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-12 w-full items-center justify-center rounded-full border border-[#D9D6CE] bg-white px-5 text-lg font-medium text-[#2F4F46]"
          >
            Sign out
          </button>
        </div>
        <FormMessages message={message} errorMessage={errorMessage} />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
          {mode === "sign-in"
            ? "Sign in"
            : mode === "create-account"
              ? "Create an account"
              : "Recover your password"}
        </h1>
        <p className="text-lg text-[#66706B]">
          You can submit reviews without an account. Signed-in reviews are still
          shown anonymously.
        </p>
      </header>

      {mode !== "recover-password" && (
        <SegmentedControl
          label="Account action"
          options={[
            { value: "sign-in", label: "Sign in" },
            { value: "create-account", label: "Create account" },
          ]}
          value={mode}
          onChange={changeMode}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6">
        <div className="space-y-2">
          <label htmlFor="account-email" className="block text-lg font-medium text-[#4A5A52]">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-[#D9D6CE] bg-white px-4 text-lg focus:border-[#08873A]"
          />
        </div>

        {mode !== "recover-password" && (
          <PasswordField
            id="account-password"
            label="Password"
            value={password}
            onChange={setPassword}
            isNew={mode === "create-account"}
            hint={
              mode === "create-account"
                ? `At least ${MIN_PASSWORD_LENGTH} characters. A short phrase is easy to remember.`
                : undefined
            }
          />
        )}

        {mode === "create-account" && (
          <PasswordField
            id="account-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            isNew
          />
        )}

        {turnstileSiteKey ? (
          <Turnstile
            key={captchaResetKey}
            siteKey={turnstileSiteKey}
            options={{ action: "account_auth", theme: "light" }}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => {
              setCaptchaToken("");
              setErrorMessage("The security check could not load. Refresh and try again.");
            }}
          />
        ) : (
          <p className="rounded-2xl bg-[#FBEDE9] px-4 py-3 text-[#8A3B2B]" role="alert">
            Account security is not configured yet.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !captchaToken || !turnstileSiteKey}
          className="min-h-12 w-full rounded-full bg-[#08873A] px-5 text-lg font-medium text-white disabled:opacity-60"
        >
          {isSubmitting
            ? "Please wait..."
            : mode === "sign-in"
              ? "Sign in"
              : mode === "create-account"
                ? "Create account"
                : "Email me a reset link"}
        </button>
      </form>

      {mode === "sign-in" && (
        <button
          type="button"
          onClick={() => changeMode("recover-password")}
          className="mx-auto block min-h-11 font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4 hover:decoration-[#2F4F46]"
        >
          Forgot password?
        </button>
      )}

      {mode === "recover-password" && (
        <button
          type="button"
          onClick={() => changeMode("sign-in")}
          className="mx-auto block min-h-11 font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4 hover:decoration-[#2F4F46]"
        >
          Back to sign in
        </button>
      )}

      <FormMessages message={message} errorMessage={errorMessage} />
    </section>
  );
}

// Matches the minimum length set in Supabase Auth. Only new passwords are
// held to it, so older, shorter passwords can still sign in.
const MIN_PASSWORD_LENGTH = 10;

function newPasswordProblem(password: string, confirmPassword: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "The passwords do not match.";
  }
  return "";
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  isNew = false,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isNew?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-lg font-medium text-[#4A5A52]">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-[#66706B]">
          {hint}
        </p>
      )}
      <input
        id={id}
        type="password"
        autoComplete={isNew ? "new-password" : "current-password"}
        minLength={isNew ? MIN_PASSWORD_LENGTH : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-[#D9D6CE] bg-white px-4 text-lg focus:border-[#08873A]"
      />
    </div>
  );
}
