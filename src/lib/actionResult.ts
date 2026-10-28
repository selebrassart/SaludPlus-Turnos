/**
 * Server Actions that throw send the client a generic, redacted message in
 * production, so the validation text written in the `validations` layer never
 * reaches the user. Returning the failure as a value keeps it intact.
 *
 * Lives outside `src/routes` on purpose: a "use server" module may only export
 * async functions, so neither the type nor the helper could be declared there.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function runAction<T>(
  operation: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Ocurrió un error inesperado."

    // "Unauthorized" is thrown by the session guards and is not worth showing
    // verbatim to the person sitting in front of the screen.
    return {
      ok: false,
      error:
        message === "Unauthorized"
          ? "No tenés permisos para realizar esta acción."
          : message,
    }
  }
}
