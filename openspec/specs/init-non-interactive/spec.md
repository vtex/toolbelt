# init-non-interactive

## Purpose

TBD — captures the `vtex init` flags that let the command run without interactive prompts (template selection, overwrite confirmation, and template listing), enabling scripted/automated project initialization.

## Requirements

### Requirement: Select template via flag
The `vtex init` command SHALL accept an optional `--template <name>` string flag. When provided, the command SHALL skip the interactive template selector and use `<name>` as the chosen template directly, provided `<name>` matches one of the templates currently visible to the logged-in user (i.e. present in the access-filtered template list, after applying the `VTEXInternalTemplates` filter).

#### Scenario: Valid template name provided
- **WHEN** a user runs `vtex init myproj --template service-example` and `service-example` is in the access-filtered template list for that user
- **THEN** the command clones `service-example` without prompting for template selection

#### Scenario: Unknown template name provided
- **WHEN** a user runs `vtex init myproj --template does-not-exist` and `does-not-exist` is not in the access-filtered template list for that user
- **THEN** the command fails with an error naming `does-not-exist` and listing the currently available (access-filtered) template names, without cloning anything

#### Scenario: Internal-only template requested by external user
- **WHEN** a non-`@vtex.` user runs `vtex init myproj --template <internal-only-name>`, where `<internal-only-name>` is listed in `VTEXInternalTemplates`
- **THEN** the command fails exactly as it would for any other unrecognized name, listing only the templates that user is authorized to see, and does not clone the internal-only template

### Requirement: List available templates
The `vtex init` command SHALL accept an optional `-l` / `--list` boolean flag. When provided, the command SHALL print the access-filtered template names available to the logged-in user and exit without cloning, prompting, or requiring the `projectFolderName` argument.

#### Scenario: List requested
- **WHEN** a user runs `vtex init --list`
- **THEN** the command prints the template names currently visible to that user (per the same access filter used by the interactive selector) and exits, performing no clone

#### Scenario: List combined with other flags or arguments
- **WHEN** a user runs `vtex init myproj --template service-example --list` (or any other combination including `-y`)
- **THEN** the command behaves exactly as `vtex init --list` — it prints the available template names and exits, ignoring `projectFolderName`, `--template`, and `-y`

### Requirement: Skip overwrite confirmation via flag
The `vtex init` command SHALL accept an optional `-y` / `--yes` boolean flag. When provided, the command SHALL skip the interactive confirmation prompt that asks whether to proceed writing into the target folder, and proceed directly to cloning the chosen template.

#### Scenario: Yes flag provided with folder confirmation pending
- **WHEN** a user runs `vtex init myproj --template service-example -y`
- **THEN** the command does not prompt for overwrite confirmation and proceeds directly to cloning `service-example` into `myproj`

#### Scenario: Yes flag omitted
- **WHEN** a user runs `vtex init myproj --template service-example` without `-y`
- **THEN** the command still prompts for overwrite confirmation before cloning, as it does today

### Requirement: Fully non-interactive invocation
The `vtex init` command SHALL support running with zero interactive prompts when both `--template <name>` (with a valid, access-filtered name) and `-y`/`--yes` are provided together with a `projectFolderName`.

#### Scenario: Fully unattended run succeeds
- **WHEN** a user or automated caller runs `vtex init myproj --template service-example -y` and `service-example` is a valid, access-filtered template name
- **THEN** the command clones `service-example` into `myproj` without any interactive prompt, and exits successfully

#### Scenario: Fully unattended run fails deterministically on bad template
- **WHEN** an automated caller runs `vtex init myproj --template does-not-exist -y`
- **THEN** the command fails immediately with the unknown-template error (listing available names) and does not prompt interactively at any point
