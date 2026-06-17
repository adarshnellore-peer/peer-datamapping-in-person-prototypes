import type { ReactNode } from "react";
import { X } from "lucide-react";

export function SidePanel({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close overlay"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col border-l border-[#d4ced3] bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.12)]">
        <header className="border-b border-[#d4ced3] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-medium text-[#302f2f]">{title}</h2>
              {subtitle && (
                <p className="mt-1 text-[13px] text-[#636161]">{subtitle}</p>
              )}
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[#f5f5f5]">
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex justify-end border-t border-[#d4ced3] px-5 py-4">
          {footer}
        </footer>
      </aside>
    </>
  );
}
