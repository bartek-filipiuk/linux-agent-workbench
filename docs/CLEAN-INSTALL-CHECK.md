# Clean installation check

Owner-run check for the first source release. **Pending: no clean-user or clean-machine pass is claimed.** Local development tests and CI do not replace this check.

Use a fresh Linux user or machine with a desktop session, rootless Podman, Node 24, pnpm 10.24.0 and the native dependencies listed in the README. Do not copy existing app settings, node_modules, browser profiles or locally built image IDs. Clone the final main/release revision and record its commit.

```bash
git clone https://github.com/bartek-filipiuk/linux-agent-workbench.git
cd linux-agent-workbench
nvm install
nvm use
npm install --global pnpm@10.24.0
pnpm install --frozen-lockfile
pnpm images:build
pnpm images:build:browser
pnpm dev
```

Use your own provider credentials, kept outside the selected workspace. Check both the default Classic path and the [Auto configuration](APPLICATION.md#configure-and-run-the-measured-setup). One standard profile is enough; the isolated Auto profile is optional.

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Fresh build | Both worker images build and are detected; record storage-check failures separately | Pending |
| Classic without Jev key | App starts; terminal and browser tasks work with configured primary provider | Pending |
| Configure Jev + OpenRouter | Credentials stay private; Auto becomes available; billing/provider choice is explicit | Pending |
| Simple Auto task | Open IANA example domains and report the title/URL with visible page evidence | Pending |
| Form task | Fill a synthetic preview form; no real purchase or sending | Pending |
| Stop | Stop an active task; no further browser actions after cancellation | Pending |
| Manual takeover | Take control, then resume from a fresh observation | Pending |
| Classic after Auto/Stop | A new Classic task still works | Pending |
| Restart and follow-up | Conversation restoration and follow-up respect the current workspace/provider | Pending |
| Browser restart | Browser recovers; saved profile behavior matches documented limitations | Pending |
| Layout | No blocked controls or horizontal overflow at 1400×900 and 1024×768 | Pending |

Record distro/version, architecture, Node/pnpm/Podman versions, commit, image build results, desktop/keyring backend and which providers were exercised. Report errors with synthetic task data and redacted logs. Do not include keys, cookies, account balances or private browsing history. A failure should stay recorded together with its correction and retest.

Return this checklist with the result column filled in. Until then, release notes must describe the clean-install check as pending, even if CI and developer-machine validation pass.
