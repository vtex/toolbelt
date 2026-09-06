## Why

`vtex init` only offers template selection and folder-overwrite confirmation through interactive prompts (`enquirer` select, `promptConfirm`). This makes it impossible for skills, agents, or scripts to call `vtex init` unattended — every invocation blocks waiting for a human at a TTY. Adding flags to select the template and bypass the confirmation directly enables fully non-interactive use (e.g. `vtex init myproj --template service-example -y`) while keeping the existing interactive flow as the default for human users.

## What Changes

- Add a `--template <name>` string flag to `vtex init` that skips the interactive template selector (`promptTemplates()`) and clones the named template directly.
  - The name is validated against the **access-filtered** template list (`getTemplates()`, which already applies the `VTEXInternalTemplates` filter based on the logged-in user's email domain) — the same list the interactive prompt and `--list` show. Internal-only templates stay inaccessible to non-`@vtex.` users even via this flag.
  - An unmatched name fails with a new error message that names the exact template requested and enumerates the available (access-filtered) template names, so a failed non-interactive call is self-correcting on retry.
- Add a `-l` / `--list` boolean flag that prints the access-filtered template names and exits immediately, without cloning anything.
  - `--list` always short-circuits: if passed alongside `projectFolderName`, `--template`, or `-y`, those are ignored and only the list is printed (same behavior model as `--help`).
- Add a `-y` / `--yes` boolean flag that skips the `promptContinue()` overwrite-confirmation prompt, proceeding straight to cloning.
- None of the existing interactive behavior changes when these flags are omitted.

## Capabilities

### New Capabilities
- `init-non-interactive`: Non-interactive template selection, discovery, and confirmation bypass for the `vtex init` command.

### Modified Capabilities
- (none — no existing specs in this repo yet; the interactive `vtex init` behavior itself is not changing, only extended)

## Impact

- Affected files: `src/commands/init.ts` (new flags), `src/modules/init/index.ts` (flag handling, list printing, template validation, confirmation bypass), `src/lib/constants/Messages.ts` (new error/list messages).
- No changes to `src/modules/init/git.ts` cloning internals, to the `@vtex.` email-based access-filter logic, or to template content itself.
- No existing tests cover `src/modules/init/`; this change is a good opportunity to add coverage using the `FeatureFlag`-mocking pattern already established in `src/__tests__/modules/featureFlag/featureFlagDecider.test.ts`.
