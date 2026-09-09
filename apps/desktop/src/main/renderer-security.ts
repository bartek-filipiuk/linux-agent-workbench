/** Only the app's exact entry document may use the privileged preload bridge. */
export function isRendererUrl(actual: string, expected: string): boolean {
  if (!expected) return false;
  try {
    const a = new URL(actual), e = new URL(expected);
    a.hash = e.hash = "";
    return a.href === e.href;
  } catch { return false; }
}

export function isTrustedRenderer(
  event: { sender: unknown; senderFrame: { url: string } | null },
  contents: { mainFrame: { url: string } } | null | undefined,
  entryUrl: string,
): boolean {
  return !!contents && event.sender === contents && event.senderFrame === contents.mainFrame
    && isRendererUrl(event.senderFrame.url, entryUrl);
}
