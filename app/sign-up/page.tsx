export default function SignUpPage() {
  return (
    <section className="mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Register a clinician account to upload studies and review AI-assisted pulmonary reports.
      </p>
      <form className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Full name
          <input className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
        </label>
        <label className="grid gap-1 text-sm">
          Email
          <input type="email" className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
        </label>
        <label className="grid gap-1 text-sm">
          Password
          <input type="password" className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
        </label>
        <button type="button" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          Create account
        </button>
      </form>
    </section>
  );
}
