---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
---

`<Mark>` colours words inside one title: `<Title>into the <Mark color="$accent">stars</Mark></Title>`. A mark takes `color` (a colour or a theme token), `weight`, `italic` and `background`, and is part of the title's text, with no id or time of its own. Typewriter and word-by-word animations count its words with the rest. The title's text stays plain for everything that reads it, with the marks as ranges of it (`runs`). `text/setContent` keeps a mark on its words when the text around them changes, or takes `runs` to set them, and the file is written back with its `<Mark>`s (and `Mark` imported). An unknown token in a mark is reported, `theme-literals` warns on a literal mark colour, and anything else inside a title is now an error that names it, instead of an empty title.
