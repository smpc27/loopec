"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { labelClassName } from "@/components/auth/auth-shell";
import { signIn } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type CollegeSignInFormProps = {
  nextPath?: string;
  collegeName?: string;
  collegeDomain?: string;
  showDevHelpers?: boolean;
};

function PasswordSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full font-semibold transition-all duration-200"
      size="md"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifying credentials...</span>
        </>
      ) : (
        <>
          <span>Sign in with password</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function CollegeSignInForm({
  nextPath = "",
  collegeName = "National Institute of Technology Calicut",
  collegeDomain = "nitc.ac.in",
  showDevHelpers = process.env.NODE_ENV === "development",
}: CollegeSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);

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

      {/* Main 1-Click Google Sign-In Section */}
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-gray-900">Sign in with your College ID</h2>
          <p className="text-xs text-gray-500">
            Click below to log in instantly with your official NITC college email address.
          </p>
        </div>

        {/* Big Prominent Google Button */}
        <GoogleSignInButton
          nextPath={nextPath || "/marketplace"}
          label="Continue with Google"
        />

        {/* Trust Badges */}
        <div className="pt-2 border-t border-gray-100 space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Instant access — <strong>no passwords</strong> or OTPs to enter</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600 shrink-0" />
            <span>Restricted exclusively to verified <strong>@{cleanDomain}</strong> peers</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Buyer protection & campus hostel handover points active</span>
          </div>
        </div>
      </div>

      {/* Collapsible Staff / Developer Alternate Login */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3 text-xs">
        <button
          type="button"
          onClick={() => setShowStaffLogin(!showStaffLogin)}
          className="flex w-full items-center justify-between text-left text-gray-500 hover:text-gray-800 transition py-0.5"
        >
          <span className="font-medium">Staff & Developer Password Sign-In</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              showStaffLogin ? "rotate-180" : ""
            }`}
          />
        </button>

        {showStaffLogin && (
          <form action={signIn} className="mt-3 space-y-3 border-t border-gray-200 pt-3">
            <input type="hidden" name="next" value={nextPath} />

            <div>
              <label className={labelClassName} htmlFor="staff-email">
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="staff-email"
                  className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-500"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`admin@${cleanDomain}`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="staff-password">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="staff-password"
                  className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-xs outline-none focus:border-violet-500"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <PasswordSubmitButton />

            {showDevHelpers && (
              <div className="flex gap-2 pt-1 text-[11px] text-gray-500">
                <span>Demo fill:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(`b261175ee@${cleanDomain}`);
                    setPassword("CampusPilot@2026!");
                  }}
                  className="font-semibold text-violet-700 underline"
                >
                  Student (B26)
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
