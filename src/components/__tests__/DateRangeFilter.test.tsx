import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DateRangeFilter from "../DateRangeFilter";

describe("DateRangeFilter", () => {
  it("renderiza los valores 'from'/'to' en sus inputs respectivos", () => {
    render(
      <DateRangeFilter
        from="2026-08-01"
        to="2026-08-17"
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-08-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-08-17");
  });

  it("escribir en 'Desde' llama a onFromChange sin afectar 'Hasta'", async () => {
    const onFromChange = vi.fn();
    const onToChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DateRangeFilter
        from=""
        to=""
        onFromChange={onFromChange}
        onToChange={onToChange}
      />,
    );
    await user.type(screen.getByLabelText("Desde"), "2026-08-01");
    expect(onFromChange).toHaveBeenCalled();
    expect(onToChange).not.toHaveBeenCalled();
  });

  it("escribir en 'Hasta' llama a onToChange sin afectar 'Desde'", async () => {
    const onFromChange = vi.fn();
    const onToChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DateRangeFilter
        from=""
        to=""
        onFromChange={onFromChange}
        onToChange={onToChange}
      />,
    );
    await user.type(screen.getByLabelText("Hasta"), "2026-08-17");
    expect(onToChange).toHaveBeenCalled();
    expect(onFromChange).not.toHaveBeenCalled();
  });

  it("ambos inputs son de tipo date", () => {
    render(
      <DateRangeFilter from="" to="" onFromChange={vi.fn()} onToChange={vi.fn()} />,
    );
    expect(screen.getByLabelText("Desde")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("type", "date");
  });
});
