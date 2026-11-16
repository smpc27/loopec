import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartHandshake, Lightbulb, MessageSquareQuote, ShieldCheck, Sparkles, Star } from "lucide-react";
import { connection } from "next/server";
import { requireApprovedMember } from "@/lib/auth/member";
import { submitPlatformFeedback } from "@/app/feedback/actions";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const isSuccess = params.success === "1";
  const error = params.error;
  const { profile } = await requireApprovedMember();

  return (
    <main className="min-h-screen bg-transparent">
      {/* Header - Frosted Glass Bar */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/marketplace" className="text-sm font-extrabold tracking-[.14em] text-[#302546]">
            LOOPEC <span className="ml-2 font-normal tracking-normal text-[#8b8590]">Campus Feedback</span>
          </Link>
          <Link href="/marketplace" className="text-xs font-semibold text-violet-800 hover:text-violet-950 transition">
            Return to marketplace
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <Link className="inline-flex items-center gap-2 text-xs font-semibold text-[#77717e] hover:text-violet-900" href="/marketplace">
          <ArrowLeft size={14} /> Back to marketplace
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-violet-700">
              <ShieldCheck size={14} /> National Institute of Technology Calicut
            </p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight text-[#28232f]">
              Campus Feedback & Suggestions
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6c6576]">
              LOOPEC is built for NIT Calicut peers. Share ideas for new features, trade categories, senior giveaway drives, or report bugs.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 backdrop-blur-md p-4 text-xs text-violet-950 max-w-xs shadow-sm">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-700" />
              Community Driven
            </p>
            <p className="mt-1 text-violet-800 leading-relaxed">
              Every suggestion is reviewed by campus peers & admins to make hostel exchanges faster, safer, and 100% free.
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="mt-8 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 backdrop-blur-md p-6 text-emerald-950 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-emerald-950">Thank you for your feedback!</h3>
                <p className="mt-1 text-sm text-emerald-800 leading-relaxed">
                  Your feedback has been received and forwarded to our campus moderators. A confirmation notification has also been sent to your account.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
                  >
                    Browse Marketplace
                  </Link>
                  <Link
                    href="/feedback"
                    className="inline-flex items-center rounded-full border border-emerald-300 bg-white/80 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-white transition"
                  >
                    Submit Another Feedback
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200/80 bg-rose-50/80 backdrop-blur-md p-4 text-xs font-semibold text-rose-800 shadow-sm">
            Please make sure all fields are filled out accurately.
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
          {/* Main Form - Frosted Glass Panel */}
          <div className="rounded-[32px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_60px_-25px_rgba(40,25,65,0.1),_inset_0_1px_2px_rgba(255,255,255,0.95)]">
            <h2 className="text-base font-bold text-[#30273a] flex items-center gap-2">
              <MessageSquareQuote size={18} className="text-violet-700" />
              Submit Your Feedback
            </h2>
            <p className="mt-1 text-xs text-[#827b8a]">
              Submitting as <span className="font-semibold text-violet-950">{profile.full_name}</span> (@{profile.handle})
            </p>

            <form action={submitPlatformFeedback} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#4c4556]">Feedback Category *</label>
                <select
                  name="category"
                  required
                  defaultValue="feature_request"
                  className="mt-2 min-h-11 w-full rounded-xl border border-violet-100/80 bg-white/70 backdrop-blur-sm px-3.5 text-sm text-[#383141] outline-none focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-100 shadow-inner"
                >
                  <option value="feature_request">💡 Feature Request & Improvement</option>
                  <option value="trade_barter">🔄 Trade & Barter Experience</option>
                  <option value="giveaway">🎁 Free Giveaway & Senior Donation</option>
                  <option value="bug">🐞 Report a Bug or Glitch</option>
                  <option value="general">⭐ General Platform Rating & Experience</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4c4556]">Overall Experience Rating *</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {[
                    { val: "5", label: "5 · Excellent" },
                    { val: "4", label: "4 · Good" },
                    { val: "3", label: "3 · Okay" },
                    { val: "2", label: "2 · Fair" },
                    { val: "1", label: "1 · Poor" },
                  ].map((item, idx) => (
                    <label
                      key={item.val}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm p-2 text-center transition hover:border-violet-300 hover:bg-white/90 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50/90 shadow-sm"
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={item.val}
                        defaultChecked={idx === 0}
                        className="sr-only"
                      />
                      <Star size={16} className="text-amber-500 fill-amber-400" />
                      <span className="mt-1 text-[11px] font-semibold text-[#30283c]">{item.val} ★</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4c4556]">Subject / Summary *</label>
                <input
                  name="subject"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="e.g. Add hostel block delivery meetup spots"
                  className="mt-2 min-h-11 w-full rounded-xl border border-violet-100/80 bg-white/70 backdrop-blur-sm px-3.5 text-sm outline-none focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-100 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4c4556]">Detailed Feedback / Suggestions *</label>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  placeholder="Tell us what you love, what felt confusing, or what feature would make campus exchanges better for you."
                  className="mt-2 w-full rounded-xl border border-violet-100/80 bg-white/70 backdrop-blur-sm p-3.5 text-sm outline-none focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-100 resize-y shadow-inner"
                />
              </div>

              <div className="rounded-xl border border-white/80 bg-white/50 backdrop-blur-sm p-3.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="anonymous"
                    className="h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-500"
                  />
                  <span className="text-xs text-[#524b5c]">
                    Submit anonymously (do not attach my name or handle to this feedback)
                  </span>
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-950 via-purple-900 to-indigo-950 text-white font-bold shadow-lg shadow-violet-950/20 hover:opacity-95 transition">
                Submit Campus Feedback
              </Button>
            </form>
          </div>

          {/* Side Info Cards - Frosted Glass */}
          <div className="space-y-4">
            <div className="rounded-[28px] border border-indigo-200/80 bg-indigo-50/70 backdrop-blur-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <HeartHandshake size={16} className="text-indigo-700" />
                Recent Feature Updates
              </h3>
              <ul className="mt-3 space-y-2.5 text-xs text-indigo-900 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">✓</span>
                  <span><strong>Trade & Barter:</strong> Swap textbooks, drafters, or calculators without cash.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">✓</span>
                  <span><strong>Free Senior Giveaways:</strong> Graduating seniors donate items directly to juniors at ₹0.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">✓</span>
                  <span><strong>Direct WhatsApp & UPI:</strong> Connect and coordinate directly on campus with 0% platform fee.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#30283c] flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                Community Guidelines
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#777080]">
                All feedback is monitored to keep our campus environment respectful, collaborative, and helpful for everyone at NIT Calicut.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
