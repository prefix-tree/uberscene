# awesome-ai-motion, card text

The English text of the 637 technique cards of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion)
(MIT, by gongnyang), as `cards.json`: each card's slug, number, family, name, what it is, what it conveys, when to
use it, what it goes with and its sources. Their clips, GSAP implementations and Korean text are left out.

UberScene's motion catalog (`examples/showcase/motion-cards.ts`, `examples/showcase/motion/`) adapts these cards one
by one: the text comes from here, and each technique gets an UberScene file in one look, its values and a prompt.
`pnpm docs:gen` builds the site's Motion catalog and the skill's `references/motion-catalog.md` from both.

[`LICENSE`](./LICENSE) is theirs, and [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) lists the sources they credit.
