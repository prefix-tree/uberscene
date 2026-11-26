# The UberScene plugin

Two [Agent Skills](https://agentskills.io) for a coding agent:

- [`uberscene`](skills/uberscene) teaches it to make and edit videos with UberScene: the whole language (every
  element, effect, transition, component and command), how to write the TSX file, cut on words and shots, add titles,
  captions, effects and motion graphics, then check and render it with the `uberscene` command line.
- [`uberscene-setup`](skills/uberscene-setup) teaches it to install UberScene: check Node, install the packages, fetch
  Chrome for Testing, prove it works with a test file, and upgrade or repair it later.

## Claude Code

```
/plugin marketplace add prefix-tree/uberscene
/plugin install uberscene@prefix-tree
```

## Any other agent

In your project, the CLI writes both skills, matching the version it is:

```sh
npx uberscene skills install --dir .agents/skills/uberscene   # writes uberscene and uberscene-setup beside it
```

Or copy the two folders, [`skills/uberscene`](skills/uberscene) and [`skills/uberscene-setup`](skills/uberscene-setup),
to where your agent reads skills; for Claude Code without the plugin that is `.claude/skills/` in a project or
`~/.claude/skills/` for every project.

Both `SKILL.md` files are written by hand. Everything in `references/` is generated from the code by `pnpm docs:gen`, so it
matches the code on the main branch; CI fails when it drifts.

See [With your agent](https://uberscene.prefixtree.xyz/guide/agents) in the docs.
