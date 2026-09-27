import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

test("all sheet templates have balanced Handlebars blocks", async () => {
  const directory = new URL("../templates/", import.meta.url);
  for (const file of (await readdir(directory)).filter(name => name.endsWith(".hbs"))) {
    const source = await readFile(new URL(file, directory), "utf8");
    const stack = [];
    for (const match of source.matchAll(/{{\s*([#/])\s*([\w.-]+)[^}]*}}/g)) {
      if (match[1] === "#") stack.push(match[2]);
      else assert.equal(stack.pop(), match[2], `${file}: unmatched ${match[0]} at offset ${match.index}`);
    }
    assert.deepEqual(stack, [], `${file}: unclosed blocks`);
  }
});
