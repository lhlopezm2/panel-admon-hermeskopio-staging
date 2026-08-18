import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";

describe("toCsv", () => {
  it("arma el header y las filas separados por CRLF", () => {
    expect(toCsv("Descripcion", ["a", "b"])).toBe("Descripcion\r\na\r\nb");
  });

  it("devuelve solo el header cuando no hay filas", () => {
    expect(toCsv("Descripcion", [])).toBe("Descripcion");
  });

  it("entrecomilla un campo que contiene una coma", () => {
    expect(toCsv("Descripcion", ["hola, mundo"])).toBe(
      'Descripcion\r\n"hola, mundo"',
    );
  });

  it("entrecomilla y duplica comillas internas", () => {
    expect(toCsv("Descripcion", ['dijo "hola"'])).toBe(
      'Descripcion\r\n"dijo ""hola"""',
    );
  });

  it("entrecomilla un campo con salto de línea", () => {
    expect(toCsv("Descripcion", ["linea 1\nlinea 2"])).toBe(
      'Descripcion\r\n"linea 1\nlinea 2"',
    );
  });

  it("no entrecomilla texto plano sin caracteres especiales", () => {
    expect(toCsv("Descripcion", ["texto normal"])).toBe(
      "Descripcion\r\ntexto normal",
    );
  });
});
