// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CatalogImage } from "./catalog-image";

describe("CatalogImage", () => {
  afterEach(cleanup);

  it("renders a local catalog asset with accessible alternative text", () => {
    render(
      <div className="relative h-40 w-40">
        <CatalogImage
          alt="Botines Control FG Verde vista lateral"
          sizes="160px"
          src="/catalog/products/control-fg-verde-1.png"
        />
      </div>,
    );

    expect(
      screen.getByAltText("Botines Control FG Verde vista lateral"),
    ).toBeInTheDocument();
  });

  it("keeps an accessible fallback when the image is unavailable", () => {
    render(
      <div className="relative h-40 w-40">
        <CatalogImage
          alt="Botines Control FG Verde vista lateral"
          fallbackLabel="Control FG Verde"
          sizes="160px"
          src={null}
        />
      </div>,
    );

    expect(
      screen.getByRole("img", {
        name: "Botines Control FG Verde vista lateral",
      }),
    ).toHaveTextContent("Control FG Verde");
  });
});
