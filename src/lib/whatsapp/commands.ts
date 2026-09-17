export type CommandResult =
  | { kind: "verify"; code: string }
  | { kind: "add"; title: string }
  | { kind: "complete"; target: string }
  | { kind: "list" }
  | { kind: "help" }
  | { kind: "unknown" };

export function parseCommand(text: string): CommandResult {
  const lower = text.trim().toLowerCase();
  if (!lower) return { kind: "unknown" };

  const verifyMatch = lower.match(/^(?:verificar|verify|vincular)\s+([a-z0-9]{4,})$/);
  if (verifyMatch) return { kind: "verify", code: verifyMatch[1] };

  const add = lower.match(/^(?:anadir|nueva|crear|add|agregar|a(?:ñ|n)adir)\s+(.+)$/)?.[1];
  if (add) return { kind: "add", title: add.trim() };

  const done = lower.match(/^(?:completar|hecha|terminar|marcar|done)\s+(.+)$/)?.[1];
  if (done) return { kind: "complete", target: done.trim() };

  if (["listar", "pendientes", "lista", "pending", "list"].includes(lower)) {
    return { kind: "list" };
  }
  if (["ayuda", "help", "start", "menu", "comandos", "hola"].includes(lower)) {
    return { kind: "help" };
  }
  return { kind: "unknown" };
}