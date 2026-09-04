// Hosts the human has cleared for a workspace, shared by the browser policy and the egress proxy.
// Exact hostnames only ("www.x.com" and "api.x.com" are two entries); no registrable-domain logic.
export type AllowlistStore = { listAllowedHosts(workspaceId: string): string[]; addAllowedHost(workspaceId: string, host: string): void };

export class HostAllowlist {
  private readonly hosts: Set<string>;

  constructor(
    private readonly store: AllowlistStore,
    private readonly workspaceId: string,
  ) {
    this.hosts = new Set(store.listAllowedHosts(workspaceId).map((h) => h.toLowerCase()));
  }

  has(host: string): boolean {
    return this.hosts.has(host.toLowerCase());
  }

  /** `persist` keeps the host for future sessions of this workspace; without it the entry lives until the app restarts. */
  add(host: string, opts: { persist: boolean }): void {
    const h = host.toLowerCase();
    this.hosts.add(h);
    if (opts.persist) this.store.addAllowedHost(this.workspaceId, h);
  }

  list(): string[] {
    return [...this.hosts].sort();
  }
}
