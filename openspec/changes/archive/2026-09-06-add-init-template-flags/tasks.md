## 1. Messages

- [x] 1.1 Add `Messages.ERROR_TEMPLATE_NOT_FOUND(name, availableNames)` to `src/lib/constants/Messages.ts`, following the existing convention (function returning a string), listing `availableNames` in the message text.
- [x] 1.2 Add `Messages.INIT_LIST_TEMPLATES_HEADER()` (or similar) if a header/intro line is desired above the printed template names for `--list` output; otherwise print names directly via `log.info`.

## 2. Command flags (`src/commands/init.ts`)

- [x] 2.1 Add `template: oclifFlags.string({ description: '...' })` to `static flags`, following the `switch.ts` convention of spreading `...CustomCommand.globalFlags` first.
- [x] 2.2 Add `list: oclifFlags.boolean({ char: 'l', description: '...' })` to `static flags`.
- [x] 2.3 Add `yes: oclifFlags.boolean({ char: 'y', description: '...' })` to `static flags`.
- [x] 2.4 Update `run()` to destructure `{ template, list, yes }` from `flags` alongside the existing `projectName` arg, and pass them through to `appsInit`.

## 3. Non-interactive logic (`src/modules/init/index.ts`)

- [x] 3.1 Update the exported `default` function's signature to accept an options object (e.g. `{ template?: string; list?: boolean; yes?: boolean }`) alongside `projectFolderName`.
- [x] 3.2 At the top of the function, if `list` is true: print the access-filtered template names from `getTemplates()` via `log.info` and return immediately — before any other flag/arg is read, so `--list` always short-circuits per spec.
- [x] 3.3 If `template` is provided (and `list` is not): validate it against `getTemplates()`. If not found, throw `new Error(Messages.ERROR_TEMPLATE_NOT_FOUND(template, getTemplates()))`. If found, use it directly as the chosen template name instead of calling `promptTemplates()`.
- [x] 3.4 If `template` is not provided (and `list` is not), keep calling `promptTemplates()` exactly as today.
- [x] 3.5 In `promptContinue()` (or its call site), skip the confirmation prompt entirely when `yes` is true, proceeding directly to `git.clone(...)`.
- [x] 3.6 Verify the existing `catch` block's error handling (`log.error(err.message); log.debug(err)`) still applies cleanly to the new `ERROR_TEMPLATE_NOT_FOUND` throw path (no special-casing needed, but confirm no unhandled promise rejection before `process.exit()` paths).

## 4. Tests

- [x] 4.1 Add `src/__tests__/modules/init/` test file(s) covering: `--template` with a valid access-filtered name skips the prompt and clones directly; `--template` with an unknown name throws with the expected message contents; `--template` naming an internal-only template is rejected for a non-`@vtex.` user exactly like an unknown name.
- [x] 4.2 Add a test for `--list` printing the access-filtered names and returning without cloning, including when combined with other flags/args (should behave identically to `--list` alone).
- [x] 4.3 Add a test for `-y`/`--yes` skipping the confirmation prompt and proceeding to clone, and a test confirming the confirmation still runs when `-y` is omitted.
- [x] 4.4 Mock `FeatureFlag.getSingleton()` and `SessionManager.getSingleton()` following the pattern in `src/__tests__/modules/featureFlag/featureFlagDecider.test.ts`, providing fixture `templates` and `VTEXInternalTemplates` values for both an `@vtex.` and a non-`@vtex.` user case.

## 5. Documentation

- [x] 5.1 Update `static examples` in `src/commands/init.ts` to include at least one example using `--template` and `-y` together (e.g. `vtex init project-name --template service-example -y`).
- [x] 5.2 Update flag `description` strings to be clear enough for `vtex init --help` output alone to explain the non-interactive flow (no external docs assumed).
