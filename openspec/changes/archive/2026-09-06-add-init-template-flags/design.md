## Context

`vtex init` (`src/commands/init.ts`) currently parses a single optional positional arg (`projectName`) and delegates everything to `src/modules/init/index.ts`, which:
- Reads `templates: Record<string, Template>` from a feature flag (`FeatureFlag.getSingleton().getFeatureFlagInfo('templates')`) — no schema validation, purely runtime config.
- Filters it through `getTemplates()`, which hides `VTEXInternalTemplates`-listed keys from users whose logged-in email doesn't match `@vtex\.`.
- Prompts interactively via `enquirer` (`promptTemplates()`) to choose a template, then via `promptConfirm` (`promptContinue()`) to confirm writing into the target folder.
- Clones the chosen template with `git.clone(repo, org, projectFolderName)`.

There are no existing tests for this module, and no schema/fixture anywhere documents concrete template names — `getTemplates()` is the only authoritative, access-correct source of valid names at runtime.

## Goals / Non-Goals

**Goals:**
- Let `vtex init` run with zero interactive prompts when given `--template <name>` and `-y`/`--yes`.
- Let a caller (human or agent) discover valid template names via `-l`/`--list` without needing to read source or trigger a failure first.
- Keep template-name validation and listing backed by exactly one source of truth (`getTemplates()`) so the access filter (`VTEXInternalTemplates`) can't be bypassed or drift out of sync between the prompt, `--list`, and `--template` validation.
- Preserve today's fully-interactive behavior by default (no flags passed).

**Non-Goals:**
- No changes to how templates are authored, stored, or fetched (`git.ts` internals untouched).
- No changes to the `@vtex.` email-domain access-filter logic itself.
- No new template metadata (descriptions, versions, etc.) — `--list` prints names only, matching what the interactive prompt already shows.

## Decisions

1. **Validate `--template` against `getTemplates()`, not raw `templates`.**
   Rationale: `getTemplates()` already encodes the internal-vs-external access boundary. Validating against the raw `templates` record would let any caller clone an internal-only template by name, defeating the existing filter. Alternative considered — validate against raw `templates` and rely on a separate authorization check — rejected as needless duplication of logic that already exists in one place.

2. **`--list` is handled first, before any other flag/arg is read for its effect.**
   In `run()`, check `flags.list` immediately after `this.parse(Init)` and return early (printing names, no clone) if set — mirroring how oclif's own `--help` short-circuits. Any other flags/args present are simply not read. Alternative considered — throw an error if `--list` is combined with other flags — rejected as unnecessarily strict and inconsistent with `--help`'s behavior in this same command.

3. **`-y`/`--yes` only bypasses `promptContinue()`, not `promptTemplates()`.**
   Template selection and overwrite confirmation are independent concerns; `-y` alone (without `--template`) still opens the interactive selector but skips the confirmation once a template is chosen. This keeps the flags composable and each one individually meaningful.

4. **New error message follows the existing `Messages.ts` convention exactly**: a function returning a string, thrown as `new Error(...)` at the call site (in `modules/init/index.ts`, not inside `Messages.ts`). Add `Messages.ERROR_TEMPLATE_NOT_FOUND(name, availableNames)` alongside the existing `ERROR_COULD_NOT_DETERMINE_DEFAULT_BRANCH`.

5. **`--list` output goes through `log.info`** (consistent with all other user-facing output in this module), one template name per line, sourced from `getTemplates()` at call time — no caching, so it always reflects the current feature-flag state and the current logged-in user's access level.

## Risks / Trade-offs

- [Risk] A caller scripts around `--template` using a name copied from `--list` output at one point in time, but the feature-flag-backed template list changes before the next run, causing an unexpected `ERROR_TEMPLATE_NOT_FOUND`. → Mitigation: the error message enumerates currently available names, making the failure self-correcting on retry; no further mitigation needed since this mirrors the existing risk with the interactive prompt (choices can already change between runs).
- [Risk] Combining `-y` with a still-interactive `--template`-less run means a user could accidentally skip the folder-overwrite confirmation while still being prompted for template choice, if they intended `-y` to mean "answer yes to everything." → Mitigation: flag descriptions in `init.ts` explicitly state `-y` only bypasses the overwrite confirmation, not template selection.
- [Risk] `--list`'s always-short-circuit behavior silently ignores `projectFolderName`/`--template`/`-y` if a caller passes them together by mistake, with no warning. → Mitigation: acceptable per explicit product decision (matches `--help` semantics); not treated as an error.

## Migration Plan

No migration needed — purely additive flags, default (no-flags) behavior is unchanged. No rollback complexity beyond reverting the commit.

## Open Questions

None outstanding — flag semantics, validation source, and short-circuit behavior were confirmed during exploration.
