// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogApiContent } from "./catalog-api-content";

const emptyPage = {
  data: [],
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

function response(body: unknown, ok = true) {
  return { ok, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

describe("CatalogApiContent", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an explicit empty state when the products API returns a successful empty page", async () => {
    fetchMock
      .mockResolvedValueOnce(response(emptyPage))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));

    render(<CatalogApiContent featuredOnly={false} />);

    expect(screen.getByText("Cargando productos del catálogo…")).toBeInTheDocument();
    expect(await screen.findByText("No encontramos productos para esta búsqueda.")).toBeInTheDocument();
    expect(screen.queryByText("Cargando productos del catálogo…")).not.toBeInTheDocument();
  });

  it("shows a catalog error when the products API fails", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ code: "CATALOG_UNAVAILABLE" }, false))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));

    render(<CatalogApiContent featuredOnly={false} />);

    expect(await screen.findByText("No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.")).toBeInTheDocument();
    expect(screen.queryByText("Cargando productos del catálogo…")).not.toBeInTheDocument();
  });

  it("does not keep the catalog loading when taxonomy requests fail independently", async () => {
    fetchMock
      .mockResolvedValueOnce(response(emptyPage))
      .mockRejectedValueOnce(new Error("categories unavailable"))
      .mockRejectedValueOnce(new Error("brands unavailable"));

    render(<CatalogApiContent featuredOnly={false} />);

    await waitFor(() => expect(screen.getByText("No encontramos productos para esta búsqueda.")).toBeInTheDocument());
    expect(screen.queryByText("Cargando productos del catálogo…")).not.toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.")).not.toBeInTheDocument();
  });
});
