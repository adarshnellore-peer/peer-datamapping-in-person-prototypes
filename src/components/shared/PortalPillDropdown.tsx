import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export const DROPDOWN_MENU_WIDTH_PX = 280;
export const DROPDOWN_MENU_MAX_HEIGHT_PX = 320;
export const DROPDOWN_MENU_VIEWPORT_MARGIN_PX = 8;

type MenuAlign = "start" | "end";

function usePortalDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  width: number,
  maxHeight: number,
  align: MenuAlign,
) {
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const margin = DROPDOWN_MENU_VIEWPORT_MARGIN_PX;
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const resolvedMaxHeight = Math.min(
      maxHeight,
      openUp ? spaceAbove - 4 : spaceBelow - 4,
    );
    const top = openUp ? rect.top - resolvedMaxHeight - 4 : rect.bottom + 4;

    setMenuStyle({
      top: Math.max(margin, top),
      left,
      width,
      maxHeight: Math.max(120, resolvedMaxHeight),
    });
  }, [align, anchorRef, maxHeight, width]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onLayoutChange = () => updateMenuPosition();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, updateMenuPosition]);

  return menuStyle;
}

export type PortalPillDropdownItem = {
  key: string;
  number?: string;
  label: string;
  title?: string;
  onClick?: () => void;
};

export function ReferenceSectionLabel({
  number,
  title,
}: {
  number?: string;
  title: string;
}) {
  return (
    <span className="peer-ref-section-label">
      {number ? (
        <span className="peer-ref-section-label-num">{number}</span>
      ) : null}
      <span className="peer-ref-section-label-title">{title}</span>
    </span>
  );
}

export function PortalPillDropdown({
  open,
  anchorRef,
  triggerRef,
  menuRef,
  onClose,
  header,
  items,
  ariaLabel,
  width = DROPDOWN_MENU_WIDTH_PX,
  maxHeight = DROPDOWN_MENU_MAX_HEIGHT_PX,
  align = "start",
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  header: ReactNode;
  items: PortalPillDropdownItem[];
  ariaLabel: string;
  width?: number;
  maxHeight?: number;
  align?: MenuAlign;
}) {
  const menuStyle = usePortalDropdownPosition(anchorRef, open, width, maxHeight, align);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node;
      if (triggerRef?.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [anchorRef, menuRef, onClose, open, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      className="peer-dropdown-menu peer-dropdown-menu--portal"
      style={menuStyle}
    >
      <div className="peer-dropdown-menu-head">{header}</div>
      <div className="peer-dropdown-menu-body">
        {items.map((item) => {
          const content = (
            <ReferenceSectionLabel number={item.number} title={item.label} />
          );
          const tooltip =
            item.title ?? (item.number ? `${item.number} ${item.label}` : item.label);

          if (item.onClick) {
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  item.onClick?.();
                }}
                className="peer-dropdown-pill peer-dropdown-pill--interactive"
                title={tooltip}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={item.key} className="peer-dropdown-pill" title={tooltip}>
              {content}
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
