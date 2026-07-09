# Spec: Remove login dependency for `help` in the toolbelt CLI

## Problem

`src/oclif/hooks/init.ts` → `main()` always calls `checkLogin(options.id)`, which
forces an interactive login for any command not present in an `allowedList`.
Running `vtex <command> --help` (e.g. `vtex deploy --help`) sets
`options.id = 'deploy'` (not in the allowed list) and triggers a login prompt,
even though only static help text is requested. This blocks agents (and users)
from discovering commands without credentials.

## Goal

All help invocations render without requiring login, so agents on any machine can
discover the proper commands to run.

## Scope

**In scope** — skip login for every help form:

- `vtex help`
- `vtex help <command>`
- `vtex <command> --help` / `-h`
- `vtex --help` / `-h`
- `vtex` (no args — already allowed via `undefined`)

**In scope (hardening)** — defensive fallback for the empty-feature-flag-cache
crash in `showHelp` (see design decision 6). Logged-out help on clean machines
makes this crash much more likely, so it lands in the same PR.

**Out of scope** — anything beyond the login gate and the help-rendering
fallback (e.g. reworking how feature flags are fetched/updated).

## Design decisions

1. **Generic help detection, not per-command whitelisting.** Whitelisting each
   command cannot cover `vtex deploy --help`, so we detect "this is a help
   invocation" generically.

2. **New helper `isHelpInvocation(commandId, argv)` in
   `src/oclif/hooks/utils.ts`** (next to `getHelpSubject`). Returns `true` when:
   - `commandId === 'help'`, or
   - `argv` contains `--help` or `-h` **before** any `--` separator.
   - `-h` / `--help` are safe to treat as help: `-h` is globally reserved for
     help in `src/api/oclif/CustomCommand.ts`, with no other usage.

3. **Respect the `--` separator** when scanning args, consistent with the existing
   `getHelpSubject`, so `vtex cmd -- --help` is not treated as help.

4. **Wire into `checkLogin` via an explicit `argv` parameter.** Change the
   signature to `checkLogin(command: string, argv: string[])` and early-return
   when `isHelpInvocation(command, argv)` is `true`. The init hook already
   receives the parsed args (`options.argv` in `src/oclif/hooks/init.ts`), so
   the call site becomes `checkLogin(options.id, options.argv)`. Passing argv
   explicitly (instead of reading `process.argv` inside `checkLogin`) keeps the
   function testable.

5. **No hidden dependency in help rendering.** `FeatureFlag.getSingleton()` reads
   a local Configstore file (no network/auth at render time), so skipping the
   login gate fully unblocks help.

6. **Defensive feature-flag fallback in `showHelp`.** `showHelp` reads
   `COMMANDS_GROUP` / `COMMANDS_GROUP_ID` from the feature-flag Configstore,
   which is populated by a non-blocking child process
   (`FeatureFlagUpdateChecker` → `spawnUnblockingChildProcess`). On a fresh
   install both can be `undefined`, and `Object.keys(commandsId)` throws.
   Guard with sensible defaults so help always renders: when either value is
   missing, fall back to rendering all commands under a single default
   ("Other") group. This is a small hardening change and ships in the same PR.

7. **Document the `--` separator handling.** Add a short comment in
   `src/oclif/hooks/utils.ts` (next to `isHelpInvocation` / `getHelpSubject`)
   explaining why args after `--` are ignored, to avoid future regressions.

## Testing

- Add `src/oclif/hooks/utils.test.ts` with table-driven cases for
  `isHelpInvocation`:
  - `help` → true; `help deploy` → true; `deploy --help` → true;
    `deploy -h` → true; `--help` / `-h` → true
  - `deploy` → false; `deploy -- --help` → false; no args → false
- Unit test for the `checkLogin` early return (export `checkLogin` from
  `init.ts` to make it testable): with
  `SessionManager.getSingleton().checkValidCredentials()` mocked to `false` and
  a help argv (e.g. `deploy --help`), assert `authLogin` is **not** called;
  with a non-help, non-allowed command, assert it **is** called.
- Integration smoke test (shell): run `node bin/run help` (and
  `node bin/run deploy --help`) in an environment simulating no credentials
  (isolated `HOME`/config dir with no session and an empty feature-flag cache),
  asserting the process exits 0, renders help output, and emits no interactive
  login prompt. This also exercises the feature-flag fallback (decision 6).
- Beyond the above, the init hook is not unit-tested directly (heavy side
  effects); coverage is via the pure helper and the smoke test.
