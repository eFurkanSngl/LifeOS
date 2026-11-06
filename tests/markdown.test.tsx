// @vitest-environment jsdom
import { expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Markdown } from "../packages/ui/src/markdown";
it("renders formatted notes while treating HTML and script links as plain text", () => {
  const { container } = render(
    <Markdown
      body={
        "# Ders notu\n**Önemli**\n`kod`\n<img src=x onerror=alert(1)>\n[zararlı](javascript:alert(1))"
      }
    />,
  );
  expect(screen.getByRole("heading", { name: "Ders notu" })).toBeTruthy();
  expect(container.querySelector("strong")?.textContent).toBe("Önemli");
  expect(container.querySelector("img,script,a")).toBeNull();
  expect(container.textContent).toContain("<img");
  cleanup();
});
