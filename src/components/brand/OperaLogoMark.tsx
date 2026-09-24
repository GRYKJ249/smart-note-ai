import logoUrl from "@/assets/opera-ai-mark.png";
const logoAsset = { url: logoUrl };

type OperaLogoMarkProps = {
  className?: string;
  label?: string;
  animated?: boolean;
};

export function OperaLogoMark({ className = "h-10 w-10", label, animated = true }: OperaLogoMarkProps) {
  return (
    <img
      src={logoAsset.url}
      className={`object-contain drop-shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_35%,transparent)] ${animated ? "transition-transform duration-300 hover:scale-105" : ""} ${className}`}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
    />
  );
}