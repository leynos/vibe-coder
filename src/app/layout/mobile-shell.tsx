/** @file Mobile device frame used to present the mockup screens. */

import type { JSX, ReactNode } from "react";

import { useDisplayMode } from "../providers/display-mode-provider";

export interface MobileShellProps {
  /** Main content rendered inside the framed device shell. */
  children: ReactNode;
  /** Optional background node (for gradients or imagery). */
  background?: ReactNode;
  /** Additional Tailwind classes appended to the frame. */
  className?: string;
  /** Adjusts subtle styling nuances depending on theme tone. */
  tone?: "dark" | "light";
}

function joinClassNames(...tokens: Array<string | false | null | undefined>): string {
  return tokens.filter(Boolean).join(" ");
}

/**
 * Constrains content to a 390×844px viewport with rounded corners and drop shadow.
 *
 * @example
 * ```tsx
 * <MobileShell>
 *   <main className="flex flex-1 items-center justify-center">
 *     <p className="text-base-content/80">Coming soon</p>
 *   </main>
 * </MobileShell>
 * ```
 */
export function MobileShell({
  background,
  children,
  className,
  tone = "dark",
}: MobileShellProps): JSX.Element {
  const { mode } = useDisplayMode();

  const hasBackground = Boolean(background);
  const backgroundNode = hasBackground ? (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {background}
    </div>
  ) : null;

  if (mode === "hosted") {
    const frameClasses = joinClassNames(
      "relative h-[844px] w-[390px] overflow-hidden rounded-[40px] border bg-base-100 shadow-2xl",
      tone === "dark" ? "border-base-300/40 bg-base-100/95" : "border-base-200 bg-base-100",
      className,
    );

    return (
      <div
        className="flex min-h-screen items-center justify-center bg-base-200/80 px-4 py-10"
        data-mobile-shell="hosted"
      >
        <div className={frameClasses}>
          {backgroundNode}
          <div className="relative flex h-full flex-col">{children}</div>
        </div>
      </div>
    );
  }

  const surfaceClasses = joinClassNames(
    "relative min-h-screen w-full text-base-content",
    tone === "dark" ? "bg-base-200" : "bg-base-100",
  );

  const contentClasses = joinClassNames("relative flex min-h-screen w-full flex-col", className);

  return (
    <div className={surfaceClasses} data-mobile-shell="full">
      {backgroundNode}
      <div className={contentClasses}>{children}</div>
    </div>
  );
}
