"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PrivacyPolicyDialogProps {
  policyText: string;
  triggerText: string;
  linkText: string;
  title: string;
  content: string;
}

export function PrivacyPolicyDialog({
  policyText,
  triggerText,
  linkText,
  title,
  content,
}: PrivacyPolicyDialogProps) {
  const parts = policyText.split(linkText);

  return (
    <Dialog>
      <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {parts[0]}
        <DialogTrigger asChild>
          <button className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer">
            {linkText}
          </button>
        </DialogTrigger>
        {parts[1]}
      </p>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed py-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
