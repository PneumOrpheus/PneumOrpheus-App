export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-brand/20 bg-white shadow-sm lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand via-third to-fifth p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">
            PneumOrpheus
          </p>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
            AI-assisted pulmonary diagnostics for clinical cancer workflows.
          </h2>
        </div>

        <blockquote className="relative z-10 max-w-md text-sm text-white/90">
          “Designed for faster interpretation, clearer report review, and reliable patient follow-up.”
        </blockquote>
      </div>

      <div className="flex items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {children}
          <p className="mt-8 text-center text-xs text-zinc-500">
            By continuing, you agree to the clinical data handling policy.
          </p>
        </div>
      </div>
    </section>
  );
}