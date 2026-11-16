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
  User,
  Eye,
  EyeOff,
  Building2,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { labelClassName } from "@/components/auth/auth-shell";
import { signUp } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type College = {
  id: string;
  name: string;
  email_domains: string[];
};

type CollegeSignUpFormProps = {
  colleges: College[];
};

function ManualSignUpSubmitButton() {
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
          <span>Registering...</span>
        </>
      ) : (
        <>
          <span>Create account with password</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function CollegeSignUpForm({ colleges }: CollegeSignUpFormProps) {
  const defaultCollege = colleges[0] ?? null;
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(
    defaultCollege?.id ?? ""
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const selectedCollege =
    colleges.find((c) => c.id === selectedCollegeId) ?? defaultCollege;
  const primaryDomain = selectedCollege?.email_domains?.[0]?.trim().toLowerCase() ?? "nitc.ac.in";

  return (
    <div className="space-y-6">
      {/* Institution Header Tag */}
      <div className="flex items-center justify-between rounded-xl bg-violet-50/80 px-3.5 py-2.5 text-xs text-violet-950 border border-violet-100">
        <span className="flex items-center gap-1.5 font-medium">
          <GraduationCap className="h-4 w-4 text-violet-700" />
          <span>{selectedCollege?.name ?? "National Institute of Technology Calicut"}</span>
        </span>
        <span className="font-bold text-violet-800">@{primaryDomain}</span>
      </div>

      {/* Primary 1-Click Google Sign-Up Card */}
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-gray-900">Create Account with NITC Google ID</h2>
          <p className="text-xs text-gray-500">
            No registration forms or email OTPs required. Authenticate directly with your college Google account.
          </p>
        </div>

        {/* Big Google Button */}
        <GoogleSignInButton
          nextPath="/marketplace"
          label="Sign up with Google"
        />

        {/* Verified Features */}
        <div className="pt-2 border-t border-gray-100 space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Zero email confirmation delay — <strong>Instant Onboarding</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600 shrink-0" />
            <span>Profile name & college credentials synced automatically</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Direct peer WhatsApp chat & zero-fee campus transactions enabled</span>
          </div>
        </div>
      </div>

      {/* Collapsible Manual Registration Form (For offline / test environments) */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3 text-xs">
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="flex w-full items-center justify-between text-left text-gray-500 hover:text-gray-800 transition py-0.5"
        >
          <span className="font-medium">Alternative: Register with password</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              showManualForm ? "rotate-180" : ""
            }`}
          />
        </button>

        {showManualForm && (
          <form action={signUp} className="mt-3 space-y-3 border-t border-gray-200 pt-3">
            <div>
              <label className={labelClassName} htmlFor="manual-name">
                Full name
              </label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="manual-name"
                  className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-500"
                  name="full_name"
                  placeholder="e.g. Rohit Sharma"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="manual-college-select">
                Institution
              </label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  id="manual-college-select"
                  className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-500"
                  name="college_id"
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  required
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="manual-email">
                College email address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="manual-email"
                  className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-500"
                  name="email"
                  type="email"
                  placeholder={`rollnumber@${primaryDomain}`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="manual-password">
                Password (min 12 chars)
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="manual-password"
                  className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-xs outline-none focus:border-violet-500"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={12}
                  maxLength={128}
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

            <ManualSignUpSubmitButton />
          </form>
        )}
      </div>
    </div>
  );
}
