# Story: what the video says, in what order

Read this before any video longer than about 15 seconds, and before any video made from nothing (no footage to cut).
A cut of an interview has its story in the words; a film built from graphics has only the story you give it.

## One thing

Before anything else, write the one sentence the viewer should leave with. Not the topic ("our new editor"): the claim
("you edit a video by changing a line"). Everything in the video either makes that sentence land or goes.

- If the person gave a list of points, pick the one that matters most and make the rest support it, or cut them.
- If you can't write the sentence, ask. A video about three things is remembered as being about nothing.

## Three storylines, then stop

For anything you build from scratch, write three storylines before you write the file: a few lines each, in words, no
code. Make them really different, not three takes on one idea. They can differ in:

- **the world**: where it happens (a desk at 2 a.m., a kitchen, a diagram, a city map);
- **the device**: what carries it (a before and after, a countdown, one object that transforms, a conversation, a list
  that builds);
- **the form**: how it's shown (live footage, type alone, a screen recording, drawn graphics).

Recommend one and say why in a sentence. Then stop and let the person choose. Skip the stop only when they asked for
the file outright or said not to stop.

## The shape

Most short videos have the same three parts. Give each a share of the length:

| Part | Share | Its job |
|---|---|---|
| Hook | first 1 to 3 s | a question, a surprise or a result: a reason to keep watching |
| Body | about 70 % | the one thing, shown: a demo, the proof, the turn |
| Close | last 10 to 15 % | the payoff and one action: a line, a logo, a link |

- **Open on the most interesting frame**, not on a logo. A logo first is a reason to scroll past.
- **Show, then say.** The picture makes the point; a title names it.
- **Each beat earns the next.** A new idea, picture or move every 2 to 4 seconds; a beat that only repeats the last
  one goes.
- **End when it's done.** After the payoff, a second or two for the logo or the action, then stop.

## Words

- **On screen**: six words or fewer per title, one idea per title. Cut words rather than shrink the type.
- **Read time**: hold a title at least 0.5 s plus 0.3 s per word (six words: 2.3 s).
- **Spoken**: a voice-over runs at about 2.5 words a second. A 30 s film holds about 70 words of script, less with
  pauses. Write the script first and time the picture to it (`narrate`), never the other way round.
- **Plain words.** Say what it does, not what it is ("Cut on any word", not "Semantic timeline editing").
- **Real things.** Real product screens, names, numbers and logos from the person or the source. A screen you don't
  have becomes a labelled placeholder, never an invented one.

## Write the plan into the file

Put the plan in a comment at the top of `video.tsx`, so it travels with the video and the next edit can check against
it:

```tsx
// Plan
// One thing: you edit a video by changing a line.
// Storyline: B, "one prompt": a prompt typed, the edit happens, the result plays.
// Hook 0-2 s: "Edit my new ad." typed. Body 2-8 s: five passes light up. Close 8-12 s: the finished cut, one line.
// Look: dark ground, one violet accent, Inter; motion snappy. Cuts: push left; the cup carries 3.0 s.
// Banned: centred everything, fade-ins on every title, a logo first.
```

The look line comes from [look.md](look.md), the cuts from [motion.md](motion.md), and the banned line grows each
time you review it ([review.md](review.md)).

## Signs a video was made on autopilot

Look for these in your plan and in the frames, and replace each one:

- It opens on a logo or a title card, not on the most interesting thing.
- Every title fades in from the middle of the frame, all with the same entrance.
- Three bullet points appear one after another, and nothing else happens.
- Stock phrases: "Introducing…", "Unlock…", "The future of…", "Seamless".
- The same 2-second beat repeats with new words.
- A gradient background and a glow stand in for a picture.
- The music is there, but nothing happens on its hits.
- It ends with the logo spinning or growing for three seconds.

For what each kind of video needs (a launch, an explainer, an interview, a vertical short, numbers, music), see
[kinds.md](kinds.md).
