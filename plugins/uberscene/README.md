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

Everything in `references/` is generated from the code by `pnpm docs:gen`, so it matches the code on the main branch; CI
fails when it drifts. Both `SKILL.md` files, and the references written by hand (in `scripts/skill-references/`), are
prose, except for their synced sections: a part of a page between two markers that `pnpm docs:gen` writes from the
code, and `pnpm docs:check` fails on when it drifts.

```md
<!-- sync: example the-file.tsx -->
<!-- /sync -->
```

| Section | What it writes |
|---|---|
| `example <file>` | A file of [`examples/skill/`](../../examples/skill), in a code block. The file is typechecked there and resolved by `scripts/skill.test.ts`, so every example the skill shows runs. A file there that no section shows fails the check. |
| `api <entry> <export>...` | Each export's declaration as its source writes it, with its JSDoc: a function's signature, an interface or type whole, a constant's type (`api @uberscene/kit narrate NarrateOptions`). |
| `props <Element> <prop>...` | Those props of an element as a table, with type, default and JSDoc, from its schema (`props Audio volume fade duck`). |

Write the markers, run `pnpm docs:gen`, and commit what it fills in. The generators are in `scripts/gen-docs.ts`, the
markers' parser in `scripts/skill-sync.ts`.

See [With your agent](https://uberscene.prefixtree.xyz/guide/agents) in the docs.
