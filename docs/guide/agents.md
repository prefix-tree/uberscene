# With your agent

UberScene was built for a model to write: a cut names words and shots instead of seconds, every element has an id a
tool can find, and the command line checks the file like a compiler. The **UberScene skill** puts all of that in front
of your coding agent, so you can ask for a video in plain words and get a file, stills and a render back. A second
skill, **uberscene-setup**, teaches the agent to install UberScene itself: check Node, install the packages, fetch
Chrome, prove it works and upgrade it later.

## Install it

**In Claude Code**, add the repository as a plugin marketplace, then install the plugin. It carries both skills:

```
/plugin marketplace add prefix-tree/uberscene
/plugin install uberscene@prefix-tree
```

**From the command line**, in your project, write the skills that come with the installed CLI. The setup skill goes
beside the main one, in the same skills folder:

```sh
npx uberscene skills install                          # .claude/skills/uberscene and .claude/skills/uberscene-setup
npx uberscene skills install --dir .agents/skills/uberscene
```

These skills always match the CLI you have, so they never teach a command your version lacks. Run it again after
upgrading UberScene: it replaces the files it wrote, and keeps a folder you have edited unless you add `--force`. It never
deletes a file it did not write.

**In another agent**, or in Claude Code without the plugin, you can also copy the skills' folders,
[`plugins/uberscene/skills/uberscene`](https://github.com/prefix-tree/uberscene/tree/main/plugins/uberscene/skills/uberscene)
and [`plugins/uberscene/skills/uberscene-setup`](https://github.com/prefix-tree/uberscene/tree/main/plugins/uberscene/skills/uberscene-setup),
to where the agent reads skills: for Claude Code that is `.claude/skills/` in a project, or `~/.claude/skills/` for
all of them. They follow the open [Agent Skills](https://agentskills.io) format: one `SKILL.md` each, and the
reference files it links.

Then ask the agent to set UberScene up. The setup skill installs it in the project, fetches Chrome for Testing for
exports, and renders a test sheet to prove it works:

```sh
npm install uberscene @uberscene/kit react zod
npx uberscene browser install
```

## What it teaches

- **The loop.** Add the media to the manifest with `uberscene add` (transcripts included), write `video.tsx`, read
  the timeline back with `uberscene inspect`, check it with `--check-layout`, look at a sheet of its frames with
  `uberscene look`, then render with `--out`, and with `--props` for variants.
- **The file.** Its shape, `schema` and `defaults`, and the rules an editor relies on: literal ids, cuts on words and
  shots, anchors, transitions between clips, captions that follow the clips.
- **The look.** A theme first, tokens instead of literal colours, presets for text, the ready-made components, effects
  in the order a colourist works, and free code in a `<Layer>` drawn from the video's time.
- **How to edit.** The brief first, the spine of the interview before anything else, pauses inside clips, and a
  checklist before handing over.

Its reference files, every element, effect, transition and component with its props, and what renders, are generated
from UberScene's code, so they match the version on the main branch.

## How the agent looks at a cut

An agent cannot watch a video, so it checks a cut the way a person skims one: it reads the timeline back as text with
`uberscene inspect`, looks at sheets of frames with `uberscene look`, and runs the layout check. Each takes seconds, and
looking again after an edit redraws only the frames that changed, so it can look after every step.

[![A contact sheet of ten frames of a cut: each clip's first frame, both sides and the middle of two transitions, and each title, with its time, frame and name under it](/reference/look.jpg)](/reference/look.jpg)

[Checking a cut](./checking) shows every kind of sheet: across one transition, with and without an effect, a move as
a strip of frames, the safe zone drawn on, and the sound.

## Ask for a video

Put the media in a folder, with a transcript beside each recording (`talk.json` from Whisper, or `talk.srt`), and ask
for the video the way you would brief an editor:

> Make a 30 second vertical clip from talk.mp4 for Reels. Open on the sentence about shipping on Fridays, keep only
> the best take of each line, add karaoke captions and a lower third with my name, Maya Chen, Founder. Put the name
> in the schema so I can change it.

The agent adds the media, writes the file, checks it, renders stills of each cut and graphic to look at, fixes what it
sees, and renders `video.mp4`. You can then drag a clip in an editor or ask for a change in words: either way the
change lands in the same file, where the next edit can read it.

[A launch video, line by line](./writing-files) follows a file a model wrote from a brief like this one.
