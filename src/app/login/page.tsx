import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "../../lib/auth/current-user";
import { HOME } from "../../lib/auth/portal";
import LoginForm from "./LoginForm";

// A person who is already signed in goes straight to their own portal.
async function SignedInRedirect() {
  await connection();
  const user = await currentUser();
  if (user) redirect(HOME[user.role]);
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <SignedInRedirect />
    </Suspense>
  );
}
