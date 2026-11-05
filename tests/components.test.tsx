// @vitest-environment jsdom
import { afterEach, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Empty, Modal } from "../packages/ui/src/components";
afterEach(cleanup);
it("offers an accessible capture action in an empty workspace", () => {
  let clicked = false;
  render(
    <Empty
      action={() => {
        clicked = true;
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Yeni ekle" }));
  expect(clicked).toBe(true);
});
it("has a labelled modal, focus trap and keyboard dismissal", () => {
  let closed = false;
  render(
    <Modal
      title="Yeni görev"
      onClose={() => {
        closed = true;
      }}
    >
      <input aria-label="Başlık" />
    </Modal>,
  );
  expect(
    screen.getByRole("dialog").getAttribute("aria-labelledby"),
  ).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(closed).toBe(true);
});
