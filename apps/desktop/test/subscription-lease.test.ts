import { expect, it } from "vitest";
import { subscriptionLease } from "../src/preload/subscription-lease";

it("keeps terminal delivery attached when a temporary observer unsubscribes", () => {
  const changes: boolean[] = [];
  const subscribe = subscriptionLease(value => changes.push(value));
  const display = subscribe(), observer = subscribe();
  observer(); observer();
  expect(changes).toEqual([true]);
  display();
  expect(changes).toEqual([true, false]);
  const remount = subscribe(); remount();
  expect(changes).toEqual([true, false, true, false]);
});
