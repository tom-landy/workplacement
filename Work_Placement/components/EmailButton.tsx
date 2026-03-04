type EmailButtonProps = {
  email: string;
  subject?: string;
  label?: string;
  className?: string;
};

export function EmailButton({ email, subject, label = "Email", className }: EmailButtonProps) {
  const cleanEmail = email.trim();
  const href = subject
    ? `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}`
    : `mailto:${encodeURIComponent(cleanEmail)}`;

  return (
    <a
      href={href}
      className={className ?? "inline-flex items-center rounded border border-slate-300 px-2 py-1 text-xs text-primary hover:bg-slate-50"}
      title={`Email ${cleanEmail}`}
    >
      {label}
    </a>
  );
}
