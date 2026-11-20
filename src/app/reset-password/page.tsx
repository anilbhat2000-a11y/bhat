import { Suspense } from "react";
import { connection } from "next/server";
import { checkResetToken } from "../../lib/auth/password-reset";
import { LEGAL_NAME, LOGO_URL, PORTAL_NAME } from "../../lib/brand";
import { ResetForm } from "./ResetForm";

// Opened from the link in a "reset your password" email.
export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <Suspense fallback={null}><ResetPasswordContent searchParams={searchParams} /></Suspense>;
}

async function ResetPasswordContent({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await connection();
  const { token = "" } = await searchParams;
  const check = await checkResetToken(token);
  return (
    <div className="login-wrap">
      <main className="login-card">
        <p className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local PNG */}
          <img src={LOGO_URL} alt={`${LEGAL_NAME} logo`} width={232} height={72} />
        </p>
        <p className="login-title">{PORTAL_NAME}</p>
        <h1>Choose a new password</h1>
        {check.ok ? (
          <>
            <p className="login-sub">Hello {check.name}. After saving, sign in with your new password. You will be signed out on every other device.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <>
            <p role="alert">{check.error}</p>
            <p className="login-links"><a href="/forgot-password">Ask for a new link</a> · <a href="/login">Sign in</a></p>
          </>
        )}
        <p className="login-foot">{LEGAL_NAME}</p>
      </main>
    </div>
  );
}
