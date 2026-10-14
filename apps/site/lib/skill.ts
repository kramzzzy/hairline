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

/** What was typed after the command, and the page the skill wrote for it, as /skills shows them. Only their kernel is ever changed, swapped whole for the skill's current one. */
export const EXAMPLES: Example[] = [
  { idea: "a sales funnel", file: "hairline-funnel.html", sha256: "4077266e19374ac0b82159f70fe196c4b0744b5729940c2ef214a84778cfd4a9" },
  { idea: "a rate limiter", file: "hairline-clearance.html", sha256: "797e19f6a972c64f359c098ea42cff14958dbf55ac7e786fa6e19037cd4cf7c1" },
  { idea: "git branches", file: "hairline-sidings.html", sha256: "19509c6b138ca894f9a78f589f5bfd59e00a15ba04e69035d50cd17edd369737", followUp: "The rails almost disappear and the trains read as loose blocks. Make it read as a railway at a glance." },
  { idea: "weather over a city", file: "hairline-storm.html", sha256: "b7b5b52607f33df1f8f7f12b0d09e1979e3b0e058c39aa117292f403a0941eec", followUp: "The cloud looks like a stack of cylinders. Make it read as a cloud at a glance." },
];

/**
 * Three more pages hairline-create wrote, each from a company's mark. They are the Figures page's marks shelf, not
 * examples on /skills, and are pinned and checked as the examples are.
 */
export const MARKS: Example[] = [
  { idea: "an empty state for \"No deployments yet\", from Vercel's mark: the triangle as an upright slab hovering over a pad with its slot marked dim; the nearer the pointer, the lower it settles, until it seats. Name it vercel.", file: "hairline-vercel.html", sha256: "720492ce1fb3798b364a49aa882269be3bd345979c3a3d56ede5526bed4177fa" },
  { idea: "an empty state for \"No agents connected\", from Mastra's mark: the spheres of the M joined by necks on a board, the lone sphere standing apart; the pointer draws it toward the others, a neck forms, stretches and lets go. Name it mastra.", file: "hairline-mastra.html", sha256: "a663c92bffb0614e05ea357554dec07726077775db5b1d897a165941a748f1bd" },
  { idea: "an empty state for \"No pages inside\", from Notion's mark: the cube as a box with a lid, the N a relief on its front face; the pointer's height opens the lid on a spring, and the box is empty. Name it notion.", file: "hairline-notion.html", sha256: "68676a9bcb37a620836ddc646cb6d2fd1032370fb94be2ebd9abab439a9d59c3" },
];

/**
 * What was typed after /hairline-adopt: the SVG, then what the pointer does. Each page came out of a few rounds of
 * changes after that line, so none carries a single follow-up. Firecrawl's was renamed once on the site, so its
 * name is in English.
 */
export const ADOPTED: Example[] = [
  { idea: "deploy.svg the pointer's height is the thrust; raised high enough, the rocket lifts off", file: "hairline-deploy-liftoff.html", sha256: "1d30596f9fe1e55e286c4629d4572f559b95112159c671ee776a4a02bb0073a4" },
  { idea: "firecrawl.svg the flame reads a page: point down it, and each part peels off onto a sheet of markdown", file: "hairline-firecrawl-reader.html", sha256: "4d41ad4bad7bbf1813653e25336960fd4480a87d9f32884ff3fd79ebec19e424" },
  { idea: "resend.svg the R is the sender: while the pointer is over it, a belt runs out of its block and each letter rides it into a tray", file: "hairline-resend-belt.html", sha256: "628815e1d5b9e89befb722ea5e64a79cef791d1112a34549fbed1d615a06f624" },
  { idea: "linear.svg the stripes are lanes: point up across them, and the issues move lane to lane until they are done", file: "hairline-linear-cycle.html", sha256: "87a959e37ff92ca739ba2baf05e585d66451fda30a493c8ea58619a201d20ed0" },
  { idea: "cursor.svg the mark is the caret over code: point down the page, and each suggested line is accepted", file: "hairline-cursor-tab.html", sha256: "287abc2c7ec4adc1c79235e090239f3c5888188ba4e550f50adf78b957160ff2" },
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
