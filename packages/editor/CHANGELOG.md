# @uberscene/editor

## 0.6.1

### Patch Changes

- The first 0.6 on npm. 0.6.0 was tagged but never published: its GitHub release was published before the native codecs were attached, and the repository's releases cannot be changed once published. 0.6.1 holds everything 0.6.0 lists, with its codecs attached; the release is now kept a draft until its packages are staged.
- Updated dependencies
  - @uberscene/sdk@0.6.1
  - @uberscene/player@0.6.1

## 0.6.0

### Minor Changes

- b80a44b: New package `@uberscene/editor`: editor parts that share one player and can sit anywhere in a page:
  `<Editor.Root>`, `<Editor.Preview>`, `<Editor.Controls>`, `<Editor.Layers>` and `<Editor.Timeline>`, with
  `useSelection()` and `useEdit()` for undoable edits through the sdk's `Executor`. The player splits `<Player>` into
  `<PlayerProvider>` (the core) and `<PlayerView>` (the picture); `<Player>` is unchanged.

### Patch Changes

- 6e711ad: The shadcn editor's Source tab shows why the edits could not be written when the fold fails, instead of the error
  taking the whole editor down.
- 208c96c: A shadcn editor built on these parts: `npx shadcn add https://uberscene.prefixtree.xyz/r/editor.json` copies a whole
  editor into your app (layers, transport, a schema-driven inspector, a timeline you drag to move and trim, and the file
  with every edit written in), each part also its own registry item. The parts themselves are unchanged.
- 472246e: The shadcn editor's arrow and Delete shortcuts no longer fire while a tab, resize handle, list or toggle has focus.
- e410297: `trimValue(item, at)` gives the value `clip/trim` takes for an edge moved to timeline time `at`: the edge's time in the
  source file for footage, at the clip's speed, and `at` itself for anything else. The shadcn editor's inspector typed a
  duration as a timeline time even for footage, so a clip starting at 10 with `in={2}` given a duration of 3 became 11 s
  long; its Duration field and the timeline's edge drags now both go through `trimValue`.
- Updated dependencies [c8d956f]
- Updated dependencies [9cfd718]
- Updated dependencies [cf23cb8]
- Updated dependencies [e410297]
- Updated dependencies [208c96c]
- Updated dependencies [b80a44b]
- Updated dependencies [fa69b88]
- Updated dependencies [6e711ad]
- Updated dependencies [f654ff7]
- Updated dependencies [974c884]
- Updated dependencies [71e136e]
- Updated dependencies [261d5b6]
- Updated dependencies [3796367]
- Updated dependencies [3796367]
- Updated dependencies [2daa802]
- Updated dependencies [3e4e7c5]
- Updated dependencies [23f68a7]
- Updated dependencies [49ed5eb]
- Updated dependencies [7dee501]
- Updated dependencies [23f68a7]
- Updated dependencies [472246e]
- Updated dependencies [472246e]
- Updated dependencies [f81b912]
- Updated dependencies [45aabbd]
- Updated dependencies [6e711ad]
- Updated dependencies [41f2ced]
- Updated dependencies [e410297]
  - @uberscene/sdk@0.6.0
  - @uberscene/player@0.6.0
