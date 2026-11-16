import {
  GraduationCap,
  ShieldCheck,
  MapPin,
  Building2,
  Wallet,
} from "lucide-react";

type CollegeTrustShowcaseProps = {
  collegeName?: string;
  collegeDomain?: string;
};

export function CollegeTrustShowcase({
  collegeName = "National Institute of Technology Calicut",
  collegeDomain = "nitc.ac.in",
}: CollegeTrustShowcaseProps) {
  return (
    <div className="flex flex-col justify-between space-y-8 rounded-[32px] border border-[#d0c1ab]/25 bg-gradient-to-br from-[#241e14]/95 via-[#1c170f]/95 to-[#14100a]/98 backdrop-blur-2xl p-7 text-[#eee9e2] shadow-[0_30px_70px_-20px_rgba(20,15,10,0.5),_inset_0_1px_2px_rgba(255,255,255,0.15)] lg:p-9">
      {/* College Institution Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d0c1ab]/30 bg-[#d0c1ab]/10 px-3.5 py-1 text-xs font-semibold text-[#d0c1ab] backdrop-blur-md">
          <GraduationCap className="h-4 w-4 text-[#d0c1ab]" />
          <span>Official Campus Portal</span>
        </div>

        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-normal tracking-tight text-white sm:text-3xl">
            {collegeName}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#d0c1ab]/80">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#d0c1ab]" />
              NIT Campus P.O., Kozhikode, Kerala
            </span>
            <span className="text-[#d0c1ab]/50">•</span>
            <span className="font-mono font-medium text-[#eee9e2]">
              @{collegeDomain}
            </span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#eee9e2]/75 sm:text-sm">
          A closed-loop, peer-to-peer marketplace reserved strictly for students,
          researchers, and faculty members of NIT Calicut.
        </p>
      </div>

      {/* Trust Pillars - Frosted Tiles */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#d0c1ab]">
          Why Campus Authentication?
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 transition-all duration-200 hover:bg-white/10 hover:border-[#d0c1ab]/30 shadow-sm">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d0c1ab]/15 text-[#d0c1ab] border border-[#d0c1ab]/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white sm:text-sm">
                100% Verified NITC Peers
              </h3>
              <p className="text-xs leading-5 text-[#eee9e2]/70">
                Only members with verified <code className="rounded bg-black/40 px-1 py-0.5 text-[#d0c1ab]">@{collegeDomain}</code> credentials and campus ID cards can trade. No outsiders.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 transition-all duration-200 hover:bg-white/10 hover:border-[#d0c1ab]/30 shadow-sm">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d0c1ab]/15 text-[#d0c1ab] border border-[#d0c1ab]/30">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white sm:text-sm">
                Hostel & Campus Pickup Points
              </h3>
              <p className="text-xs leading-5 text-[#eee9e2]/70">
                Physical handover at recognized campus spots: MBH, LH, PG Hostels, SAC, Central Library, or Mega Mess.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 transition-all duration-200 hover:bg-white/10 hover:border-[#d0c1ab]/30 shadow-sm">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d0c1ab]/15 text-[#d0c1ab] border border-[#d0c1ab]/30">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white sm:text-sm">
                Direct WhatsApp & UPI Payments
              </h3>
              <p className="text-xs leading-5 text-[#eee9e2]/70">
                Zero-fee direct peer transfers via WhatsApp and UPI (Google Pay, PhonePe, Paytm) or cash on campus pickup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Metrics & Status - Frosted Counters */}
      <div className="border-t border-[#d0c1ab]/20 pt-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-2.5 shadow-sm">
            <p className="font-mono text-base font-bold text-white sm:text-lg">6,500+</p>
            <p className="text-[10px] text-[#d0c1ab]">Campus Peers</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-2.5 shadow-sm">
            <p className="font-mono text-base font-bold text-white sm:text-lg">12+</p>
            <p className="text-[10px] text-[#d0c1ab]">Hostel Zones</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-2.5 shadow-sm">
            <p className="font-mono text-base font-bold text-emerald-300 sm:text-lg">0%</p>
            <p className="text-[10px] text-[#d0c1ab]">Fee on Campus</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-[#d0c1ab]/80">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            NITC Pilot Campus Live
          </span>
          <span className="font-mono text-[#d0c1ab]">CiGaRa Group</span>
        </div>
      </div>
    </div>
  );
}
