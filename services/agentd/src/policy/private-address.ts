import { isIP } from "node:net";

const PRIVATE_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/i;

function ipv4Private(host: string): boolean {
  const [a = 0, b = 0] = host.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 169 && b === 254) || a >= 224;
}

/** Normalize compressed, expanded and mixed IPv6 before checking prefixes. */
function ipv6Words(host: string): number[] {
  const canonical = new URL(`http://[${host}]/`).hostname.slice(1, -1);
  const halves = canonical.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const words = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return words.map(word => Number.parseInt(word, 16));
}

/** Non-public literal address. Invalid DNS results fail closed. */
export function isPrivateIp(ip: string): boolean {
  const host = ip.replace(/^\[|\]$/g, "");
  if (isIP(host) === 4) return ipv4Private(host);
  if (isIP(host) !== 6 || host.includes("%")) return true;
  const w = ipv6Words(host);
  if (w.slice(0, 5).every(n => n === 0) && w[5] === 0xffff) {
    return ipv4Private(`${w[6]! >> 8}.${w[6]! & 255}.${w[7]! >> 8}.${w[7]! & 255}`);
  }
  // Includes unspecified, loopback and deprecated IPv4-compatible addresses.
  if (w.slice(0, 6).every(n => n === 0)) return true;
  const first = w[0]!;
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80
    || (first & 0xffc0) === 0xfec0 || (first & 0xff00) === 0xff00;
}

export function isPrivateHost(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return PRIVATE_HOSTS.test(normalized) || (isIP(normalized) !== 0 && isPrivateIp(normalized));
}

export function isPrivateAddress(url: string): boolean {
  try { return isPrivateHost(new URL(url).hostname); }
  catch { return true; }
}
