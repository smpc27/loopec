"use client";

import { GraduationCap } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type CollegeSignInFormProps = {
  nextPath?: string;
  collegeName?: string;
  collegeDomain?: string;
  showDevHelpers?: boolean;
};

export function CollegeSignInForm({
  nextPath = "",
  collegeName = "National Institute of Technology Calicut",
  collegeDomain = "nitc.ac.in",
}: CollegeSignInFormProps) {
  const cleanDomain = collegeDomain.trim().toLowerCase();

  return (
    <div className="space-y-6">
      {/* Campus Institution Tag */}
      <div className="flex items-center justify-between rounded-xl bg-violet-50/80 px-3.5 py-2.5 text-xs text-violet-950 border border-violet-100">
        <span className="flex items-center gap-1.5 font-medium">
          <GraduationCap className="h-4 w-4 text-violet-700" />
          <span>{collegeName}</span>
        </span>
        <span className="font-bold text-violet-800">@{cleanDomain}</span>
      </div>

      {/* Main 1-Click Google Sign-In Card */}
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm space-y-5">
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900">Sign in with your College ID</h2>
          <p className="text-xs text-gray-500">
            Sign in with your official NITC college email address to continue.
          </p>
        </div>

        {/* Big Prominent Google Button */}
        <GoogleSignInButton
          nextPath={nextPath || "/marketplace"}
          label="Continue with Google"
        />
      </div>
    </div>
  );
}
