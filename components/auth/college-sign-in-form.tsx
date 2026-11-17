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
      <div className="flex items-center justify-between rounded-xl bg-[#eee9e2] px-3.5 py-2.5 text-xs text-[#241e14] border border-[#d0c1ab]/50">
        <span className="flex items-center gap-1.5 font-medium">
          <GraduationCap className="h-4 w-4 text-[#241e14]" />
          <span>{collegeName}</span>
        </span>
        <span className="font-bold text-[#8e7a63]">@{cleanDomain}</span>
      </div>

      {/* Main 1-Click Google Sign-In Card */}
      <div className="rounded-2xl border border-[#d0c1ab]/50 bg-white/95 p-6 shadow-xs space-y-5">
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-bold text-[#241e14]">Sign in with your College ID</h2>
          <p className="text-xs text-[#736b60]">
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
