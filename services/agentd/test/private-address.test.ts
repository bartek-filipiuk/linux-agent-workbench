import { describe, expect, it } from "vitest";
import { isPrivateHost, isPrivateIp, isPrivateAddress } from "../src/policy/private-address.js";

describe("non-public address filtering", () => {
  it.each(["::ffff:127.0.0.1", "::ffff:7f00:1", "0:0:0:0:0:ffff:ac10:1", "::ffff:172.31.255.255", "::ffff:a9fe:a9fe", "0:0:0:0:0:0:0:1", "febf::1", "fe90::1", "fc00::1", "fd00::1", "fec0::1", "ff02::1", "100.64.0.1", "100.127.255.255", "224.0.0.1", "255.255.255.255", "fe80::1%eth0"])("denies %s", ip => {
    expect(isPrivateIp(ip)).toBe(true);
  });
  it.each(["8.8.8.8", "100.128.0.1", "172.32.0.1", "::ffff:8.8.8.8", "::ffff:808:808", "2606:4700:4700::1111"])("allows public %s", ip => {
    expect(isPrivateIp(ip)).toBe(false);
  });
  it("normalizes URL literals without mistaking domains for IPv6", () => {
    expect(isPrivateAddress("http://[::ffff:172.16.0.1]/")).toBe(true);
    expect(isPrivateAddress("http://2130706433/")).toBe(true);
    expect(isPrivateHost("localhost.")).toBe(true);
    expect(isPrivateHost("fcnews.example")).toBe(false);
    expect(isPrivateHost("fd.example")).toBe(false);
    expect(isPrivateIp("not-an-ip")).toBe(true);
  });
});
