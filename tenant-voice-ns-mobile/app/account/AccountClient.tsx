"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

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
      if (password.length < 8) {
        setErrorMessage("Choose a password with at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("The passwords do not match.");
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
    return <p className="text-gray-600" role="status">Checking sign-in status...</p>;
  }

  if (isPasswordReset) {
    return (
      <section className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-[#2F4F46]">Choose a new password</h1>
          <p className="text-gray-600">Use at least 8 characters.</p>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-[#2F4F46] px-5 font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
        <AccountMessages message={message} errorMessage={errorMessage} />
      </section>
    );
  }

  if (session) {
    const isAdmin = session.user.email?.toLowerCase() === adminEmail;
    return (
      <section className="space-y-5">
        <h1 className="text-3xl font-bold text-[#2F4F46]">Your account</h1>
        <p className="text-gray-700">
          You’re signed in. Reviews you choose to submit while signed in can be
          privately linked to your account for future account features. Your
          account identity is not shown on public reviews.
        </p>
        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center font-medium text-[#2F4F46] underline"
          >
            Open moderation queue
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className="block min-h-11 rounded-xl border border-[#DEDCD5] px-5 font-medium text-[#2F4F46]"
        >
          Sign out
        </button>
        <AccountMessages message={message} errorMessage={errorMessage} />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#2F4F46]">
          {mode === "sign-in"
            ? "Sign in"
            : mode === "create-account"
              ? "Create an account"
              : "Recover your password"}
        </h1>
        <p className="text-gray-600">
          You can submit reviews without an account. Signed-in reviews are still
          shown anonymously.
        </p>
      </header>

      {mode !== "recover-password" && (
        <div className="inline-flex rounded-lg border border-[#DEDCD5] p-1">
          <ModeButton
            active={mode === "sign-in"}
            onClick={() => changeMode("sign-in")}
          >
            Sign in
          </ModeButton>
          <ModeButton
            active={mode === "create-account"}
            onClick={() => changeMode("create-account")}
          >
            Create account
          </ModeButton>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="account-email" className="block font-medium">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#DEDCD5] bg-white px-4"
          />
        </div>

        {mode !== "recover-password" && (
          <PasswordField
            id="account-password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
        )}

        {mode === "create-account" && (
          <PasswordField
            id="account-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
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
          <p className="text-sm text-red-700" role="alert">
            Account security is not configured yet.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !captchaToken || !turnstileSiteKey}
          className="min-h-11 w-full rounded-xl bg-[#2F4F46] px-5 font-medium text-white disabled:opacity-60"
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
          className="min-h-11 text-sm font-medium text-[#2F4F46] underline"
        >
          Forgot password?
        </button>
      )}

      {mode === "recover-password" && (
        <button
          type="button"
          onClick={() => changeMode("sign-in")}
          className="min-h-11 text-sm font-medium text-[#2F4F46] underline"
        >
          Back to sign in
        </button>
      )}

      <AccountMessages message={message} errorMessage={errorMessage} />
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={label.includes("new") ? "new-password" : "current-password"}
        minLength={8}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[#DEDCD5] bg-white px-4"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-md px-3 text-sm font-medium ${active ? "bg-[#EEF5EB] text-[#2F4F46]" : "text-gray-600"}`}
    >
      {children}
    </button>
  );
}

function AccountMessages({
  message,
  errorMessage,
}: {
  message: string;
  errorMessage: string;
}) {
  return (
    <>
      {message && <p className="text-sm text-green-800" role="status">{message}</p>}
      {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
    </>
  );
}