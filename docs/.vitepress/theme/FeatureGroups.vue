<script setup lang="ts">
// The landing page's features, in the order a video is made: write it, play and edit it, check it, export it, hand
// it to an agent. Then the roadmap: what is being built now and what is planned, each linked to its backlog item or
// decision record. Groups sit side by side three cards to a row. Each card names one feature, says what it does in a
// line, and links to its guide. Roadmap cards are dashed, so what ships and what does not never look the same.
import { withBase } from "vitepress";

interface Feature {
  icon: keyof typeof ICONS;
  title: string;
  text: string;
  link: string;
  tag?: string;
}

interface Group {
  label: string;
  features: Feature[];
  /** Not built yet: drawn dashed, under the roadmap heading. */
  roadmap?: boolean;
}

const REPO = "https://github.com/prefix-tree/uberscene/blob/main";

// 24 px line icons, drawn for this page: stroke only, so they take the text colour.
const ICONS = {
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4",
  timeline: "M3 6h8 M14 6h7 M3 12h4 M10 12h11 M3 18h11 M17 18h4 M12 3v18",
  captions: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7 10h6 M15 10h2 M7 13h3 M12 13h5",
  effects: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 3v18 M12 7.5h7.5 M12 12h9 M12 16.5h7.5",
  graphics: "M3 15h12v5H3z M6 4h12l-3 7H3z M18 14l3 3l-3 3",
  code: "M8 7l-5 5l5 5 M16 7l5 5l-5 5 M14 4l-4 16",
  player: "M3 5h18v14H3z M10 9l5 3l-5 3z",
  edit: "M4 20h4L19 9l-4-4L4 16z M13 7l4 4 M14 20h6",
  check: "M3 4h8v7H3z M13 4h8v7h-8z M3 13h8v7H3z M14 17l2 2l4-4",
  export: "M12 3v12 M7 10l5 5l5-5 M4 17v3h16v-3",
  chip: "M7 7h10v10H7z M10 10h4v4h-4z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4",
  agent: "M3 5h18v14H3z M7 10l3 2l-3 2 M12 15h5",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12L4 7.5 M12 12v9",
  camera: "M3 7h12v10H3z M15 10l6-3v10l-6-3",
  person: "M12 4a3 3 0 1 0 0 6a3 3 0 0 0 0-6z M5 20c0-4 3-6 7-6s7 2 7 6 M3 3l18 18",
  sound: "M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11",
  text: "M4 6h16 M12 6v13 M8 19h8",
  spark: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5L18 18 M6 18l2.5-2.5 M15.5 8.5L18 6",
};

const GROUPS: Group[] = [
  {
    label: "Write the video",
    features: [
      {
        icon: "file",
        title: "One file is the video",
        text: "A TSX file holds the project, the edit and the code. Drag a clip's end and one value changes in the file.",
        link: "/guide/the-file",
      },
      {
        icon: "timeline",
        title: "Timeline elements",
        text: "Clips, tracks, transitions, titles, shapes, SVG, masks, keyframes, speed ramps, freeze frames and multicam.",
        link: "/reference/elements/",
      },
      {
        icon: "captions",
        title: "Captions and sound",
        text: "Captions from the clip's transcript that follow every trim, as karaoke or word by word. Volume, fades, ducking and pan.",
        link: "/guide/captions-and-sound",
      },
      {
        icon: "effects",
        title: "Effects and transitions",
        text: "46 of them, from exposure, curves and LUTs to keying and film burn, run as shaders in the preview and the export. Or your own in GLSL.",
        link: "/reference/effects/",
      },
      {
        icon: "graphics",
        title: "Motion graphics",
        text: "Lower thirds, callouts, counters, badges and type cards, ten ready-made blocks, and themes with fonts.",
        link: "/reference/components/",
      },
      {
        icon: "code",
        title: "Free code",
        text: "Any React, CSS, canvas, three.js or Motion on the video's clock, frame-exact when you scrub or export.",
        link: "/guide/free-code",
      },
      {
        icon: "cube",
        title: "3D scenes as clips",
        text: "A three.js scene in a plain file plays like footage: trim it, ramp it, cut to it, and tie its moments to a marker.",
        link: "/guide/free-code#a-3d-scene-as-a-clip",
      },
      {
        icon: "camera",
        title: "Camera",
        text: "A 2D camera around the tracks it moves, with keys, and a push that makes room by itself when a card comes in.",
        link: "/guide/camera",
      },
      {
        icon: "person",
        title: "Keying and cut-outs",
        text: "Keying, blurs and pins, and a person cut out of the background from any matte, in the preview and the export.",
        link: "/guide/footage-tools",
      },
    ],
  },
  {
    label: "Play and edit it",
    features: [
      {
        icon: "player",
        title: "Player",
        text: "A React <Player> that plays the file in your app, and a framework-free PlayerCore.",
        link: "/guide/player",
      },
      {
        icon: "edit",
        title: "Editing API",
        text: "99 undoable actions (trim, move, retime, restyle), each written back into the file, and a shadcn editor built on them.",
        link: "/guide/editor",
      },
    ],
  },
  {
    label: "Check it without watching",
    features: [
      {
        icon: "check",
        title: "Review tools",
        text: "Sheets of frames with the sound under them, the timeline as text, a safe-zone layout check, and lint --fix for older files.",
        link: "/guide/checking",
      },
    ],
  },
  {
    label: "Export it",
    features: [
      {
        icon: "export",
        title: "Export",
        text: "MP4, WebM and AV1, MP3 and WAV, stills and subtitles, rendered in headless Chrome with no FFmpeg. Motion blur, drafts and parallel tabs.",
        link: "/guide/exporting",
      },
      {
        icon: "chip",
        title: "Native codecs",
        text: "Rust codecs on FilmCraft's craft-libs: decode HEVC, ProRes and DNxHR, and write a ProRes master.",
        link: "/guide/native-codecs",
        tag: "Experimental",
      },
    ],
  },
  {
    label: "With your agent",
    features: [
      {
        icon: "agent",
        title: "Agent skills",
        text: "For Claude Code, Codex, Cursor, Gemini CLI and others: one skill sets UberScene up, the other knows the whole language, writes the file, checks it with frame sheets and renders it.",
        link: "/guide/agents",
      },
    ],
  },
  {
    label: "Building now",
    roadmap: true,
    features: [
      {
        icon: "person",
        title: "Cut-outs with no other tool",
        text: "uberscene matte runs a matting model on your footage and writes the matte, so a cut-out needs nothing else installed.",
        link: `${REPO}/BACKLOG.md`,
        tag: "Next",
      },
      {
        icon: "text",
        title: "Coloured words in a title",
        text: "One word of a title in the accent colour, and the text still editable as one title.",
        link: `${REPO}/BACKLOG.md`,
        tag: "Next",
      },
      {
        icon: "timeline",
        title: "Ends on a word or a beat",
        text: "An overlay that lasts until a spoken word or a beat of the music, and follows it when the cut changes.",
        link: `${REPO}/BACKLOG.md`,
        tag: "Next",
      },
      {
        icon: "sound",
        title: "Loudness on export",
        text: "A loudness target such as -14 LUFS, measured on the mix, with a true-peak limiter.",
        link: `${REPO}/BACKLOG.md`,
        tag: "Next",
      },
      {
        icon: "check",
        title: "A sound report for agents",
        text: "Loudness by role, the music's level under speech, and cuts with no sound on them, for an agent that cannot hear.",
        link: `${REPO}/BACKLOG.md`,
        tag: "Next",
      },
    ],
  },
  {
    label: "Planned",
    roadmap: true,
    features: [
      {
        icon: "camera",
        title: "Rigs and follow",
        text: "One move over many elements, and elements that follow the person or another element across the frame.",
        link: `${REPO}/docs/decisions/0041-motion-design-seams.md`,
        tag: "Planned",
      },
      {
        icon: "spark",
        title: "Generated motion",
        text: "Motion as a third kind of value beside a constant and keys: drift, shake and settle, worked out from the file.",
        link: `${REPO}/docs/decisions/0041-motion-design-seams.md`,
        tag: "Planned",
      },
      {
        icon: "cube",
        title: "Takes from a 3D blockout",
        text: "A 3D scene and its camera path guide a video model; the generated take sits beside its shot as a clip.",
        link: `${REPO}/docs/decisions/0038-generated-takes-from-the-blockout.md`,
        tag: "Planned",
      },
    ],
  },
];
</script>

<template>
  <div class="cc-features">
    <template v-for="(group, i) in GROUPS" :key="group.label">
    <p v-if="group.roadmap && !GROUPS[i - 1]?.roadmap" class="cc-features-divider">Roadmap: not in a release yet</p>
    <div class="cc-features-group"
      :class="{ roadmap: group.roadmap }"
      :style="{
        '--span': group.roadmap ? 3 : Math.min(group.features.length, 3),
        '--cols': Math.min(group.features.length, 3),
      }">
      <p class="cc-features-label">{{ group.label }}</p>
      <ul class="cc-features-cards">
        <li v-for="f in group.features" :key="f.title">
          <a :href="f.link.startsWith('http') ? f.link : withBase(f.link)" class="cc-feature">
            <span class="cc-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"><path :d="ICONS[f.icon]" /></svg>
            </span>
            <span class="cc-feature-title">{{ f.title }}<span v-if="f.tag" class="cc-feature-tag">{{ f.tag }}</span></span>
            <span class="cc-feature-text">{{ f.text }}</span>
          </a>
        </li>
      </ul>
    </div>
    </template>
  </div>
</template>
