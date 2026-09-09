import { EventEmitter } from "node:events";
import type net from "node:net";
import { expect, it } from "vitest";
import { FramedConnection } from "../src/node/connection";
import { FrameDecoder, decodeJson } from "../src/framing";
class Socket extends EventEmitter {
  writableLength = 0;
  writes: Uint8Array[] = [];
  writable = false;
  write(bytes: Uint8Array) { this.writes.push(bytes); return this.writable; }
  end() {}
  destroy(error?: Error) { if (error) this.emit("error", error); this.emit("close"); }
}
it("waits for drain, preserves reliable order and replaces pending images", () => {
  const socket = new Socket();
  const c = new FramedConnection(socket as unknown as net.Socket);
  c.notify("first");
  c.sendRaw(3, new Uint8Array([1])); c.sendRaw(3, new Uint8Array([2]));
  c.notify("second");
  expect(socket.writes).toHaveLength(1);
  socket.writable = true; socket.emit("drain");
  const frames = socket.writes.flatMap(b => new FrameDecoder().push(b));
  expect(frames).toHaveLength(3);
  expect(decodeJson(frames[0]!.payload)).toMatchObject({ type: "first" });
  expect(frames[1]!.payload).toEqual(new Uint8Array([2]));
  expect(decodeJson(frames[2]!.payload)).toMatchObject({ type: "second" });
  expect(c.bufferedBytes).toBe(0);
  c.close();
});
it("fails explicitly instead of silently dropping an over-limit reliable stream", () => {
  const socket = new Socket();
  const c = new FramedConnection(socket as unknown as net.Socket);
  const errors: string[] = []; c.on("error", e => errors.push(e.message));
  for (let i=0;i<12;i++) c.sendRaw(1, new Uint8Array(1024*1024));
  expect(c.closed).toBe(true);
  expect(errors[0]).toContain("Reliable stream queue");
});
