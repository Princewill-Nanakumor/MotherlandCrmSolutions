/** True when the event originated on a Checkbox (Radix `data-slot="checkbox"`). */
export function isCheckboxEventTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest('[data-slot="checkbox"]'))
  );
}
