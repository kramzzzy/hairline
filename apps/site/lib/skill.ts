import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COUNT } from "./figures";

/**
 * The skills, as the site tells them: the commands, the examples, and the
 * page's copy as plain text, so /skills and /llms.txt say the same thing.
 * Server only: it reads the generated pages from public/skill.
 */

export const INSTALL = "npx skills add lucasmarkes/hairline";
export const COMMAND = "/hairline-create";
export const ADOPT = "/hairline-adopt";

/**
 * `followUp` is a change asked for after the first prompt, when the page shown is the one that came out of it.
 * `sha256` is the page's hash as the skill wrote it: any change to the page is a change to this line.
 */
export type Example = { idea: string; file: string; sha256: string; followUp?: string };

/** What was typed after the command, and the page the skill wrote for it, as /skills shows them. These pages are never edited. */
export const EXAMPLES: Example[] = [
  { idea: "a sales funnel", file: "hairline-funnel.html", sha256: "1c2ad4fb6305da1ceda532da6d96f1cd3060c67d588dec2db6043920e33fc044" },
  { idea: "a rate limiter", file: "hairline-clearance.html", sha256: "36935c2412526af4331070e5a2d350f6c0a8071156b59955e815175b7a88b34d" },
  { idea: "git branches", file: "hairline-sidings.html", sha256: "c6844a3c0dc684237508644ef677ae8905b120b73c2af74d7abf5990775106ae", followUp: "The rails almost disappear and the trains read as loose blocks. Make it read as a railway at a glance." },
  { idea: "weather over a city", file: "hairline-storm.html", sha256: "fe23e7a760c742bf0c68401bb2d3544f700af36865f720b39214ebde237507c0", followUp: "The cloud looks like a stack of cylinders. Make it read as a cloud at a glance." },
];

/**
 * Three more pages hairline-create wrote, each from a company's mark. They are the Figures page's marks shelf, not
 * examples on /skills, and are pinned and checked as the examples are.
 */
export const MARKS: Example[] = [
  { idea: "an empty state for \"No deployments yet\", from Vercel's mark: the triangle as an upright slab hovering over a pad with its slot marked dim; the nearer the pointer, the lower it settles, until it seats. Name it vercel.", file: "hairline-vercel.html", sha256: "781db9ab5891183261c3ed03e1050d9fabbc9b95a2a9333425706135953dc839" },
  { idea: "an empty state for \"No agents connected\", from Mastra's mark: the spheres of the M joined by necks on a board, the lone sphere standing apart; the pointer draws it toward the others, a neck forms, stretches and lets go. Name it mastra.", file: "hairline-mastra.html", sha256: "fa4f03c971f626296cd3a720aed23b81beeda0221652b1c560820a9c3858876a" },
  { idea: "an empty state for \"No pages inside\", from Notion's mark: the cube as a box with a lid, the N a relief on its front face; the pointer's height opens the lid on a spring, and the box is empty. Name it notion.", file: "hairline-notion.html", sha256: "4ba5f67ee4a4c7d0a0a46757889c8264af3c6a21d285e81e6aa02e65e23f68d7" },
];

/**
 * What was typed after /hairline-adopt: the SVG, then what the pointer does. Each page came out of a few rounds of
 * changes after that line, so none carries a single follow-up. Two were touched once on the site: firecrawl's name
 * is in English, and linear's tick reads performance.now(), the clock its departures are set by.
 */
export const ADOPTED: Example[] = [
  { idea: "deploy.svg the pointer's height is the thrust; raised high enough, the rocket lifts off", file: "hairline-deploy-liftoff.html", sha256: "0b7392c2befd22bf553c6c08edb3b07f7945a3d01a1f3852011e309f2c4bca33" },
  { idea: "firecrawl.svg the flame reads a page: point down it, and each part peels off onto a sheet of markdown", file: "hairline-firecrawl-reader.html", sha256: "df47f616e57fbc9e2f5ab65acff68c28bbb87ac33c3a73bf4939d8c83245fd76" },
  { idea: "resend.svg the R is the sender: while the pointer is over it, a belt runs out of its block and each letter rides it into a tray", file: "hairline-resend-belt.html", sha256: "c10a3ed6d38f2da2ffb50e4a22facd234cbcc3197ba3aa2eba041f47f3d46173" },
  { idea: "linear.svg the stripes are lanes: point up across them, and the issues move lane to lane until they are done", file: "hairline-linear-cycle.html", sha256: "2272ea7240311a7cf1ce9ff3c54d6a93d03cda4a41a1b3c85bceb5680ed99ba8" },
  { idea: "cursor.svg the mark is the caret over code: point down the page, and each suggested line is accepted", file: "hairline-cursor-tab.html", sha256: "1dcbfb43b851b95d7adb001fc14e5f40a688e058e761f6c1596c240ba137a073" },
];

export type Shown = Example & { name: string; means: string; prompt: string; href: string };

const FIGURE = /<script type="module" id="hl-figure">([\s\S]*?)<\/script>/;
const NAME = /\bname:\s*["'`]([a-z][a-z0-9-]*)["'`]/;
const MEANS = /\bmeans:\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/;

/** The name and the meaning a generated page declares for its figure. */
export function declared(html: string, file: string): { name: string; means: string } {
  const figure = FIGURE.exec(html)?.[1] ?? "";
  // the declaration is the page's last call; a `name:` earlier in the figure's own code is not it
  const call = figure.slice(Math.max(0, figure.lastIndexOf("hairline({")));
  const name = NAME.exec(call)?.[1];
  const means = MEANS.exec(call)?.[2];
  if (!name || !means) throw new Error(`skill: ${file} is not a page made by the skill's build.mjs.`);
  return { name, means: means.replace(/\\(.)/g, "$1") };
}

/** A skill's examples with what their pages declare. `next build` and vitest both run from apps/site. */
export function examples(list = EXAMPLES, command = COMMAND): Shown[] {
  return list.map((e) => {
    const html = readFileSync(join(process.cwd(), "public", "skill", e.file), "utf8");
    return { ...e, ...declared(html, e.file), prompt: `${command} ${e.idea}`, href: `/skill/${e.file}` };
  });
}

export const SUMMARY = `Two skills for coding agents. hairline-create draws a new figure from an idea, and hairline-adopt starts from an SVG you already have. Both draw to Hairline's ten rules, on the same engine as the ${COUNT} in the docs, as one HTML file.`;

export const STEPS: { title: string; text: string }[] = [
  { title: "Concepts", text: "It offers two or three concepts, one line each: the object, what the pointer does, what the read-out says. You pick one." },
  { title: "Build", text: "It writes only the figure. The engine and the page around it are pasted in as they are." },
  { title: "Check", text: "A script checks the file against the rules, then the agent looks at it in a browser." },
  { title: "Hand over", text: "You get the page, the metaphor it used, the rules it leans on, and anything it could not check." },
  { title: "Adjust", text: "Ask for changes while you use it. It edits the figure and checks again." },
];

export const FOLDER = "One command installs both skills. Each is a folder of small text files. There is no npm install, and Node is only needed to run the checks.";

export const USE: string[] = [
  "Type the command with an idea. If you already have the metaphor, say it, and the concepts step is skipped.",
  "Out comes hairline-<name>.html: one file with no dependencies that opens from disk, holding the figure, an intensity slider, a theme switch and a play button that walks its tour.",
  "It runs on any agent that reads skills: Claude Code, Cursor, Codex and others.",
];

export const ADOPT_STEPS: { title: string; text: string }[] = [
  { title: "Read", text: "It measures the SVG's shapes and says what it read the drawing as and which parts it kept. If the reading is wrong, say so and it reads again." },
  { title: "Concepts", text: "It offers two or three gestures for that object, one line each. You pick one." },
  { title: "Build", text: "It builds the object new, as solids on Hairline's engine. It never traces the SVG and never animates it." },
  { title: "Check", text: "The same checks as hairline-create, with your SVG beside the figure, so the agent can see it still reads as yours." },
  { title: "Hand over", text: "You get the page. If the mark belongs to someone else, it tells you so." },
];

export const ADOPT_USE: string[] = [
  "Give it one SVG: an icon, a logo or an illustration. Say what the pointer should do, or leave that to the concepts.",
  "Out comes hairline-<name>.html, the same kind of file hairline-create writes. It hands the drawing to hairline-create, so the build and the checks are that skill's.",
];
