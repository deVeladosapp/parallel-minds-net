import type { ReactElement } from "react";

export type SalaChoice = {
  readonly t: string;
  readonly s: string;
  readonly tema: string;
};

export const SALAS: readonly SalaChoice[];

export function SeleccionSalas(props: {
  counts: Record<string, number>;
  enteringTema: string | null;
  onBack: () => void;
  onSelect: (sala: SalaChoice) => void | Promise<void>;
}): ReactElement;