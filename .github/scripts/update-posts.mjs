// Replaces the list between the posts markers in README.md with the latest posts from the blog's RSS feed.
import { readFile, writeFile } from "node:fs/promises";

const FEED = "https://ihabkhattab.com/rss.xml";
const COUNT = 5;
const START = "<!-- posts:start -->";
const END = "<!-- posts:end -->";

const decode = (s) =>
  s
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];

const res = await fetch(FEED);
if (!res.ok) throw new Error(`${FEED} returned ${res.status}`);
const xml = await res.text();

const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, item]) => ({ title: tag(item, "title"), link: tag(item, "link") }))
  .filter((p) => p.title && p.link)
  .map((p) => ({ title: decode(p.title), link: decode(p.link) }))
  .filter((p) => new URL(p.link).pathname.startsWith("/blog/"))
  .slice(0, COUNT);

if (posts.length === 0) throw new Error("No posts found in feed");

const list = posts.map((p) => `- [${p.title.replace(/[[\]]/g, "\\$&")}](${p.link})`).join("\n");

const readme = await readFile("README.md", "utf8");
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start === -1 || end === -1) throw new Error("Posts markers not found in README.md");

const updated = `${readme.slice(0, start + START.length)}\n${list}\n${readme.slice(end)}`;
if (updated !== readme) {
  await writeFile("README.md", updated);
  console.log("README.md updated");
} else {
  console.log("No new posts");
}
