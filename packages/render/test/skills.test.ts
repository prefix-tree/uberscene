import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { installSkill } from "../src";

const scratch = join(import.meta.dirname, ".tmp", "skills");
let project = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  project = mkdtempSync(join(scratch, "p-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("installSkill", () => {
  it("writes the skill and its references into .claude/skills/uberscene, with a record of what it wrote", () => {
    const result = installSkill({ cwd: project });
    expect(result.dir).toBe(join(project, ".claude", "skills", "uberscene"));
    expect(result.files).toContain("SKILL.md");
    expect(result.files).toContain(join("references", "cli.md"));
    const skill = readFileSync(join(result.dir, "SKILL.md"), "utf8");
    expect(skill).toMatch(/^---\nname: uberscene\n/);
    const marker = JSON.parse(readFileSync(join(result.dir, ".uberscene-skill.json"), "utf8"));
    expect(marker.version).toBe(result.version);
    expect(Object.keys(marker.files)).toEqual(result.files);
  });

  it("replaces a folder it wrote when nothing in it changed, and names the version it held", () => {
    const result = installSkill({ cwd: project });
    expect(result.previous).toBe(result.version);
  });

  it("keeps edits to the installed skill unless forced", () => {
    const dir = join(project, ".claude", "skills", "uberscene");
    writeFileSync(join(dir, "SKILL.md"), "my own notes\n");
    writeFileSync(join(dir, "extra.md"), "added by hand\n");
    expect(() => installSkill({ cwd: project })).toThrow(
      /changes since the skill was installed \(SKILL\.md, extra\.md\)/,
    );
    expect(readFileSync(join(dir, "SKILL.md"), "utf8")).toBe("my own notes\n");
    installSkill({ cwd: project, force: true });
    expect(readFileSync(join(dir, "SKILL.md"), "utf8")).toMatch(/^---\nname: uberscene/);
    // Forced, the skill's own files are replaced; a file added by hand is not the command's to delete.
    expect(readFileSync(join(dir, "extra.md"), "utf8")).toBe("added by hand\n");
  });

  it("does not write over a folder it did not write, and takes another folder with dir", () => {
    const other = mkdtempSync(join(scratch, "o-"));
    mkdirSync(join(other, "skills", "uberscene"), { recursive: true });
    writeFileSync(join(other, "skills", "uberscene", "SKILL.md"), "someone else's\n");
    expect(() => installSkill({ cwd: other, dir: "skills/uberscene" })).toThrow(
      /did not write; run again with --force/,
    );
    const fresh = installSkill({ cwd: other, dir: ".agents/skills/uberscene" });
    expect(fresh.dir).toBe(join(other, ".agents", "skills", "uberscene"));
  });

  describe("with force, deletes nothing it did not write", () => {
    it("leaves the other skills beside it when --dir names the skills folder itself", () => {
      const other = mkdtempSync(join(scratch, "s-"));
      const skills = join(other, ".claude", "skills");
      mkdirSync(join(skills, "mine", "references"), { recursive: true });
      writeFileSync(join(skills, "mine", "SKILL.md"), "my skill\n");
      writeFileSync(join(skills, "mine", "references", "notes.md"), "notes\n");
      writeFileSync(join(skills, "README.md"), "my skills\n");
      installSkill({ cwd: other, dir: ".claude/skills", force: true });
      expect(readFileSync(join(skills, "mine", "SKILL.md"), "utf8")).toBe("my skill\n");
      expect(readFileSync(join(skills, "mine", "references", "notes.md"), "utf8")).toBe("notes\n");
      expect(readFileSync(join(skills, "README.md"), "utf8")).toBe("my skills\n");
      expect(existsSync(join(skills, "SKILL.md"))).toBe(true);
    });

    it("leaves a project's files when --dir is the project", () => {
      const other = mkdtempSync(join(scratch, "d-"));
      writeFileSync(join(other, "package.json"), "{}\n");
      mkdirSync(join(other, "src"));
      writeFileSync(join(other, "src", "video.tsx"), "export default 1;\n");
      installSkill({ cwd: other, dir: ".", force: true });
      expect(readFileSync(join(other, "package.json"), "utf8")).toBe("{}\n");
      expect(readFileSync(join(other, "src", "video.tsx"), "utf8")).toBe("export default 1;\n");
    });

    it("removes a file of the skill the new version no longer has, and the folder it leaves empty", () => {
      const other = mkdtempSync(join(scratch, "r-"));
      const { dir } = installSkill({ cwd: other });
      const marker = JSON.parse(readFileSync(join(dir, ".uberscene-skill.json"), "utf8"));
      mkdirSync(join(dir, "gone"), { recursive: true });
      writeFileSync(join(dir, "gone", "old.md"), "from an older version\n");
      marker.files["gone/old.md"] = createHash("sha256").update("from an older version\n").digest("hex");
      writeFileSync(join(dir, ".uberscene-skill.json"), JSON.stringify(marker));
      installSkill({ cwd: other });
      expect(existsSync(join(dir, "gone"))).toBe(false);
      expect(existsSync(join(dir, "SKILL.md"))).toBe(true);
    });

    it("does not follow a marker's path out of the skill's folder", () => {
      const other = mkdtempSync(join(scratch, "m-"));
      const { dir } = installSkill({ cwd: other });
      writeFileSync(join(other, "keep.txt"), "mine\n");
      const marker = JSON.parse(readFileSync(join(dir, ".uberscene-skill.json"), "utf8"));
      marker.files["../../../keep.txt"] = "edited";
      writeFileSync(join(dir, ".uberscene-skill.json"), JSON.stringify(marker));
      installSkill({ cwd: other, force: true });
      expect(readFileSync(join(other, "keep.txt"), "utf8")).toBe("mine\n");
    });
  });
});
