import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonText } from "./LessonText";

const html = (body: string) => renderToStaticMarkup(createElement(LessonText, { body }));

it("renders paragraphs, bold, code, lists, sub-headings and notes", () => {
  const out = html("Intro with **bold** and `code`.\n\n- one\n- two\n\n1. first\n2. second\n\n## Key points\n\n> Remember this.");
  expect(out).toContain("<p>Intro with <strong>bold</strong> and <code>code</code>.</p>");
  expect(out).toContain("<ul><li>one</li><li>two</li></ul>");
  expect(out).toContain("<ol><li>first</li><li>second</li></ol>");
  expect(out).toContain('<p class="lesson-subhead">Key points</p>');
  expect(out).toContain('<p class="lesson-note">Remember this.</p>');
});

it("handles a paragraph followed by a list in one block", () => {
  expect(html("The devices are:\n- Switch\n- Router")).toContain("<p>The devices are:</p><div class=\"lesson-text\"><ul><li>Switch</li><li>Router</li></ul></div>");
});

it("shows HTML in lesson text as text, never as markup", () => {
  const out = html('<script>alert(1)</script> and <img src=x onerror="x()">');
  expect(out).not.toContain("<script>");
  expect(out).not.toContain("<img");
  expect(out).toContain("&lt;script&gt;");
});
