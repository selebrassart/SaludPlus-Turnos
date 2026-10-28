/**
 * Stub de Better Auth.
 *
 * `UserService` lo usa para dar de alta cuentas porque es quien sabe hashear
 * contraseñas. Las pruebas no verifican el hasheo: registran las altas para
 * poder afirmar que el servicio llamó con los datos correctos.
 */

export const signUpCalls = []

export const auth = {
  api: {
    async signUpEmail({ body }) {
      signUpCalls.push(body)
      return { user: { id: `user-${signUpCalls.length}`, ...body } }
    },
    async getSession() {
      return null
    },
  },
}
