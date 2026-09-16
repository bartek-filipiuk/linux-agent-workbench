/** Bounds waiting, not the underlying operation: the caller decides whether a timeout is a hung browser (control paths) or a slow page (human input). */
export async function deadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Browser operation timed out. Restart browser to recover.")), ms);
    })]);
  } finally { clearTimeout(timer); }
}
