# Browser authentication notes

This note records the implemented login approach and its remaining limitation. It is not a promise to bypass a website's account or browser policies.

## Current approach

Automated browsing uses Playwright Chromium in the browser container. For **Log in manually**, LAW first parks the agent, returns control to the human, closes the automated context and starts full Chromium on a private Xvfb/Openbox display. The app forwards full-window images and human input without attaching Playwright/CDP to that manual browser. Both modes use the same persistent profile and egress proxy.

After **Finish manual login**, the automated context reopens with the saved profile. Resuming the task is a separate explicit action. Site cookies remain sensitive and become usable by the agent after control is returned.

Manual mode is intended to make normal login windows, address bars and popups accessible. A website may still reject the account, environment, network route or authentication attempt. A failed login is not sufficient evidence that automation detection is the cause; account-specific issues can produce the same symptoms.

## Remaining OAuth transition limitation

When switching into manual mode, `BrowserSession.setManual` removes query parameters, fragments and URL credentials before persisting the return URL. This avoids storing OAuth material in the transition marker, but the sanitized URL is also used to launch manual Chromium. If switching happens on an OAuth endpoint that requires those parameters, the endpoint can return `400 malformed`.

The current workaround is to enter manual mode from the service's ordinary page and initiate sign-in inside manual Chromium. Do not try to repair this by logging full OAuth URLs, copying tokens between unrelated applications or exposing browser debugging ports over the network.

A future fix should separate the ephemeral in-memory navigation target from the sanitized persisted return marker, validate the destination, and define safe recovery after a crash. It is tracked in [ROADMAP.md](../../ROADMAP.md), not implemented by the documentation/security publication pass.

## Network and profiles

Both modes retain the sandbox's proxy route. A VPN or tunnel may change the network path but does not supply missing OAuth query parameters or resolve an account problem. Host/LAN and private addresses remain restricted through LAW's proxy.

The default profile is shared across workspaces. Closing/destroying a container is not a profile wipe. Use dedicated site accounts and explicitly manage persistent volumes if removing saved authentication is required.

## Checks and limits of evidence

Existing tests cover tab/popup selection, mode transitions, agent parking, stale-frame acknowledgement and explicit resume. Prior manual checks confirmed a successful site login with the shared profile. They do not certify every OAuth provider, CAPTCHA, Linux distribution or future Chromium version. No live user account should be used in automated regression tests.
