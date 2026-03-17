import Link from "next/link";

export default function UploadPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-6 text-white shadow-sm sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">New Report</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create New Analysis</h1>
          <p className="text-sm text-white/90">
            Upload a chest study and register patient metadata to generate a new pulmonary diagnostic report.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-brand/20 bg-white p-6 shadow-sm">
        <form className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Patient ID
            <input className="rounded-md border border-sixth bg-transparent px-3 py-2" placeholder="P-2004" />
          </label>
          <label className="grid gap-1 text-sm">
            Patient Name
            <input className="rounded-md border border-sixth bg-transparent px-3 py-2" placeholder="John Doe" />
          </label>
          <label className="grid gap-1 text-sm">
            Study Modality
            <select className="rounded-md border border-sixth bg-transparent px-3 py-2">
              <option>Chest X-ray</option>
              <option>CT Chest</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Clinician Email
            <input className="rounded-md border border-sixth bg-transparent px-3 py-2" placeholder="clinician@example.com" />
          </label>
          <label className="sm:col-span-2 grid gap-1 text-sm">
            DICOM / image file
            <input type="file" className="rounded-md border border-dashed border-sixth px-3 py-2" />
          </label>
          <button type="button" className="sm:col-span-2 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-third">
            Upload and Create Report
          </button>
        </form>
      </div>

      <p className="text-sm text-zinc-600">
        Need historical reports first? Browse <Link href="/analyses" className="underline underline-offset-4">existing analyses</Link>.
      </p>
    </section>
  );
}
