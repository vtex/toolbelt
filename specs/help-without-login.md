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

**Out of scope** — strictly the login gate only. See the tracked follow-up issue
below for the empty-feature-flag-cache crash, which is intentionally deferred.

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

4. **Wire into `checkLogin`** — skip the login call when `isHelpInvocation(...)`
   is `true`.

5. **No hidden dependency in help rendering.** `FeatureFlag.getSingleton()` reads
   a local Configstore file (no network/auth at render time), so skipping the
   login gate fully unblocks help.

## Testing

- Add `src/oclif/hooks/utils.test.ts` with table-driven cases for
  `isHelpInvocation`:
  - `help` → true; `help deploy` → true; `deploy --help` → true;
    `deploy -h` → true; `--help` / `-h` → true
  - `deploy` → false; `deploy -- --help` → false; no args → false
- The init hook is not unit-tested directly (heavy side effects); coverage is via
  the pure helper.

## Tracked follow-up issue (deferred, out of scope)

**Issue: `vtex help` can crash on a clean machine with an empty feature-flag cache.**

In `src/oclif/hooks/init.ts`, `showHelp` calls `Object.keys(commandsId)` where
`commandsId = FeatureFlag.getSingleton().getFeatureFlagInfo('COMMANDS_GROUP_ID')`.
The feature-flag file is populated by a **non-blocking** spawned child process
(`FeatureFlagUpdateChecker` → `spawnUnblockingChildProcess`), so on a fresh install
the value is `undefined` and `Object.keys(undefined)` throws. This becomes more
likely once logged-out agents run help on clean machines.

**Proposed fix (separate work):** defensively fall back to rendering all commands
under a single default ("Other") group when `COMMANDS_GROUP` / `COMMANDS_GROUP_ID`
are missing.
