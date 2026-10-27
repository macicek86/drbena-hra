import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * A fixed-height game dialog. Renders at full size first; if it will not fit,
 * scales the entire panel uniformly instead of producing an inner scrollbar.
 * Font sizes, buttons, borders and illustrations scale together.
 */
export function FitOverlay({
  children,
  className = "",
  testId,
  fitKey,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
  fitKey?: string | number;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    const fit = () => {
      const style = getComputedStyle(overlay);
      const width = overlay.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = overlay.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (width <= 0 || height <= 0) return;

      const fits = () => {
        const rect = content.getBoundingClientRect();
        // Measure rendered dimensions, including text wrapping and scaling.
        return rect.width <= width + 0.5 && rect.height <= height + 0.5;
      };

      content.style.zoom = "1";
      if (fits()) return;

      let lower = 0.1;
      let upper = 1;
      for (let i = 0; i < 14; i++) {
        const middle = (lower + upper) / 2;
        content.style.zoom = String(middle);
        if (fits()) lower = middle;
        else upper = middle;
      }
      // Leave a hairline margin for fractional pixel rounding.
      content.style.zoom = String(Math.max(0.1, lower - 0.002));
    };

    fitRef.current = fit;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(overlay);
    fit();
    void document.fonts.ready.then(schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      fitRef.current = () => undefined;
    };
  }, []);

  // Avoid layout remeasurement on every frame of an animated mini-game.
  // Callers update fitKey only when the content's size can materially change.
  useLayoutEffect(() => {
    fitRef.current();
  }, [fitKey]);

  return (
    <div
      ref={overlayRef}
      data-fit-overlay={testId}
      className={`absolute inset-0 flex items-center justify-center overflow-hidden p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] ${className}`}
    >
      <div ref={contentRef} data-fit-content className="flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}
