---
"@uberscene/render": patch
"uberscene": patch
---

A second agent skill, `uberscene-setup`, teaches a coding agent to install UberScene: check Node, install the packages, fetch Chrome for Testing, prove it works with a test file, and upgrade or repair it later. `uberscene skills install` writes it beside the `uberscene` skill (in `.claude/skills/uberscene-setup`, or beside the folder `--dir` names when that folder is called `uberscene`), the Claude Code plugin carries both, and `@uberscene/render` exports `installSkills`.
