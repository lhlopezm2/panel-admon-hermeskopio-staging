import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaginationControls from "../PaginationControls";

describe("PaginationControls", () => {
  it("calcula el total de páginas redondeando hacia arriba", () => {
    render(
      <PaginationControls
        page={1}
        totalCount={25}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("muestra al menos 1 página cuando totalCount es 0", () => {
    render(
      <PaginationControls
        page={1}
        totalCount={0}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
  });

  it("'← Anterior' está deshabilitado en la página 1 y habilitado después", () => {
    const { rerender } = render(
      <PaginationControls
        page={1}
        totalCount={25}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("← Anterior")).toBeDisabled();

    rerender(
      <PaginationControls
        page={2}
        totalCount={25}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("← Anterior")).toBeEnabled();
  });

  it("'Siguiente →' está deshabilitado en la última página y habilitado antes", () => {
    const { rerender } = render(
      <PaginationControls
        page={3}
        totalCount={25}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("Siguiente →")).toBeDisabled();

    rerender(
      <PaginationControls
        page={2}
        totalCount={25}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("Siguiente →")).toBeEnabled();
  });

  it("hacer click en 'Siguiente →' llama a onNext", async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(
      <PaginationControls
        page={1}
        totalCount={25}
        pageSize={10}
        onPrev={vi.fn()}
        onNext={onNext}
      />,
    );
    await user.click(screen.getByText("Siguiente →"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("hacer click en '← Anterior' llama a onPrev", async () => {
    const onPrev = vi.fn();
    const user = userEvent.setup();
    render(
      <PaginationControls
        page={2}
        totalCount={25}
        pageSize={10}
        onPrev={onPrev}
        onNext={vi.fn()}
      />,
    );
    await user.click(screen.getByText("← Anterior"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("un botón deshabilitado no dispara su callback", async () => {
    const onPrev = vi.fn();
    const user = userEvent.setup();
    render(
      <PaginationControls
        page={1}
        totalCount={25}
        pageSize={10}
        onPrev={onPrev}
        onNext={vi.fn()}
      />,
    );
    await user.click(screen.getByText("← Anterior"));
    expect(onPrev).not.toHaveBeenCalled();
  });
});
