/** Bounds waiting, not the underlying operation: callers must quarantine timed-out sessions. */
export async function deadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Browser operation timed out. Restart browser to recover.")), ms);
    })]);
  } finally { clearTimeout(timer); }
}
