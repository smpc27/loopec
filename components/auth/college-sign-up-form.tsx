"use client";

import { GraduationCap } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type College = {
  id: string;
  name: string;
  email_domains: string[];
};

type CollegeSignUpFormProps = {
  colleges: College[];
};

export function CollegeSignUpForm({ colleges }: CollegeSignUpFormProps) {
  const defaultCollege = colleges[0] ?? null;
  const primaryDomain = defaultCollege?.email_domains?.[0]?.trim().toLowerCase() ?? "nitc.ac.in";
  const collegeName = defaultCollege?.name ?? "National Institute of Technology Calicut";

  return (
    <div className="space-y-6">
      {/* Institution Header Tag */}
      <div className="flex items-center justify-between rounded-xl bg-violet-50/80 px-3.5 py-2.5 text-xs text-violet-950 border border-violet-100">
        <span className="flex items-center gap-1.5 font-medium">
          <GraduationCap className="h-4 w-4 text-violet-700" />
          <span>{collegeName}</span>
        </span>
        <span className="font-bold text-violet-800">@{primaryDomain}</span>
      </div>

      {/* Primary 1-Click Google Sign-Up Card */}
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm space-y-5">
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900">Create Account with NITC Google ID</h2>
          <p className="text-xs text-gray-500">
            Authenticate directly with your official college Google account.
          </p>
        </div>

        {/* Big Google Button */}
        <GoogleSignInButton
          nextPath="/marketplace"
          label="Sign up with Google"
        />
      </div>
    </div>
  );
}
