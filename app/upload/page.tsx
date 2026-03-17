import Link from "next/link";

export default function UploadPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create New Analysis</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Upload a chest study and register patient metadata to generate a new pulmonary diagnostic report.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Patient ID
            <input className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="P-2004" />
          </label>
          <label className="grid gap-1 text-sm">
            Patient Name
            <input className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="John Doe" />
          </label>
          <label className="grid gap-1 text-sm">
            Study Modality
            <select className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700">
              <option>Chest X-ray</option>
              <option>CT Chest</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Clinician Email
            <input className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="clinician@example.com" />
          </label>
          <label className="sm:col-span-2 grid gap-1 text-sm">
            DICOM / image file
            <input type="file" className="rounded-md border border-dashed border-zinc-300 px-3 py-2 dark:border-zinc-700" />
          </label>
          <button type="button" className="sm:col-span-2 inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
            Upload and Create Report
          </button>
        </form>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Need historical reports first? Browse <Link href="/analyses" className="underline underline-offset-4">existing analyses</Link>.
      </p>
    </section>
  );
}
