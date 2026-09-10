/** A temporary observer must not disconnect an existing terminal display. */
export function subscriptionLease(toggle: (enabled: boolean) => void) {
  let count = 0;
  return () => {
    if (++count === 1) toggle(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--count === 0) toggle(false);
    };
  };
}
