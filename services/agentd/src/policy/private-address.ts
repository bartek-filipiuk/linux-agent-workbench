// Private, loopback and link-local addresses: the model and the egress proxy must never reach them; the human may.

const PRIVATE_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/i;

function ipv4Private(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function ipv6Private(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return h === "::1" || h === "::" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("::ffff:127.") || h.startsWith("::ffff:10.") || h.startsWith("::ffff:192.168.") || h.startsWith("::ffff:169.254.");
}

/** A literal IPv4/IPv6 address inside a private, loopback or link-local range. */
export function isPrivateIp(ip: string): boolean {
  return ipv4Private(ip) || ipv6Private(ip);
}

/** A hostname or literal address that must not be reached from the sandbox. */
export function isPrivateHost(host: string): boolean {
  return PRIVATE_HOSTS.test(host) || isPrivateIp(host);
}

export function isPrivateAddress(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return true;
  }
  return isPrivateHost(host);
}
