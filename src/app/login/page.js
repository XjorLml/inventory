import { Suspense } from "react";
import GoogleSignInButton from "./GoogleSignInButton";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-zinc-500 text-sm">
          Sign in to manage your inventory
        </p>
      </div>
      <Suspense fallback={null}>
        <GoogleSignInButton />
      </Suspense>
    </div>
  );
}
