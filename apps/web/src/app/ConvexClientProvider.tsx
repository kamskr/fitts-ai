"use client";

import { ReactNode } from "react";
import {
  Authenticated,
  AuthLoading,
  ConvexReactClient,
  Unauthenticated,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { ErrorBoundary } from "./ErrorBoundary";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function AuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthLoading>
        <main className="flex min-h-screen items-center justify-center bg-[#EDEDED] px-6 text-black/60">
          Loading your session...
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main className="flex min-h-screen items-center justify-center bg-[#EDEDED] px-6">
          <div className="max-w-xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/40">
              Fitts
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-black">
              Sign in to continue
            </h1>
            <p className="mt-3 text-sm leading-6 text-black/60">
              The app loads after Clerk and Convex both confirm your session.
            </p>
            <SignInButton mode="modal">
              <button className="button mt-6 px-6 py-3 text-white">Sign in</button>
            </SignInButton>
          </div>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // NOTE: Once you get Clerk working you can remove this error boundary
    <ErrorBoundary>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthGate>{children}</AuthGate>
      </ConvexProviderWithClerk>
    </ErrorBoundary>
  );
}
