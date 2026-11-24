# Instrucciones de revisión (solo para revisiones de PR)

La fuente de verdad del comportamiento es `openspec/specs/<capability>/spec.md`. Revisa el diff contra ella.

## Grave (siempre se reporta, sin tope)

- Incumple un scenario de la spec viva: cita el scenario y el código que lo contradice.
- Seguridad o datos: una ruta que debería exigir sesión no la exige, se expone un dato que no debe salir (p. ej. el email), una operación que pierde o corrompe datos, un secreto en el código.
- Una respuesta que devuelve un modelo crudo en vez de pasar por un transformer y `serialize()`.
- Un comentario o doc que afirma un comportamiento que el código no tiene.

## Sugerencia (todo lo demás)

Falta de test, nombres, legibilidad, rendimiento sin impacto medible, simplificaciones.
**Máximo 5 sugerencias por revisión**, las de más valor. El resto se resume en una línea contada: «N sugerencias menores más omitidas».

## Dónde NO reportar

- Formato y lint: los vigilan Prettier, ESLint (backend) y oxlint (frontend).
- Tipos: los vigila `tsc` (`npm run typecheck`, `npm run build`).
- Que `docs/api/openapi.json` esté al día con el código: lo vigila el CI `openapi:check`.
- Código generado, que no se edita a mano: `backend/database/schema.ts`, `backend/.adonisjs/`, `frontend/src/components/ui/`, `package-lock.json`.
- Ficheros que el diff no toca, salvo que el cambio los rompa.
- Estilo personal o preferencias sin consecuencia para el comportamiento.

## Evidencia obligatoria

Para afirmar que algo se comporta de una manera, cita `fichero:línea` donde lo has visto. No lo deduzcas del nombre de una función, variable o fichero. Si no lo has podido leer, dilo («no verificado») en vez de afirmarlo.
