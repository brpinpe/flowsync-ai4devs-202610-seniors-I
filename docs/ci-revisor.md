# Revisor automático de PRs (Claude Code)

El workflow [`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza un revisor con la acción oficial [`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action) en cada PR (al abrirlo, en cada push, al reabrirlo y al pasar de borrador a listo). Publica los hallazgos como comentarios en línea del PR más un resumen final, no solo en el registro de ejecución.

## Pasos manuales pendientes

1. **Crear la credencial y guardarla como secreto del repositorio** (Settings → Secrets and variables → Actions → New repository secret). Ver [Credencial](#credencial): hay dos caminos y no son intercambiables.
2. **Si eliges el camino de la API**, edita el workflow: comenta `claude_code_oauth_token` y descomenta `anthropic_api_key`.
3. **Permitir que los workflows escriban en PRs** si la organización o el repo lo restringen: Settings → Actions → General → *Workflow permissions*. El job pide `pull-requests: write` explícitamente, pero un límite más estricto a nivel de repo u organización gana.
4. **Opcional: crear `REVIEW.md` en la raíz**, el archivo de calibración (qué es grave, cuántas sugerencias menores caben). El prompt lo lee si existe; sin él, el revisor aplica su propio criterio.
5. **Probarlo con un PR real** y confirmar que aparecen los comentarios. Hasta entonces, el workflow no se ha ejecutado nunca.

No hace falta instalar la GitHub App de Claude: el workflow le pasa el `GITHUB_TOKEN` del propio job, así que los comentarios aparecen firmados por `github-actions[bot]`.

## Credencial

Las dos opciones van a **entradas distintas de la acción** y se guardan en **secretos con nombre distinto**:

| | 1. Suscripción (recomendado aquí) | 2. Clave de API de la consola |
|---|---|---|
| Cómo se obtiene | En local, `claude setup-token`, con tu cuenta Pro/Max | [Claude Console](https://platform.claude.com/) → API Keys |
| Entrada de la acción | `claude_code_oauth_token` | `anthropic_api_key` |
| Nombre del secreto | `CLAUDE_CODE_OAUTH_TOKEN` | `ANTHROPIC_API_KEY` |
| Quién paga | Consume el uso incluido en tu suscripción | Se factura por tokens a la organización de la consola |

> **No los cruces.** Un token de `setup-token` en `anthropic_api_key`, o una clave de API en `claude_code_oauth_token`, hace que el job **falle en la primera llamada al modelo con un error de autenticación que no dice por qué**. Si ves un fallo de auth nada más arrancar, comprueba primero que entrada y tipo de credencial coinciden.

## En qué se va el dinero

- **Modelo:** `--model sonnet`, el alias de la versión vigente de Sonnet, con `--effort medium`. Sonnet es bastante más barato que Opus por token y sobra para leer un diff y señalar problemas. El esfuerzo medio limita cuánto razona por turno.
- **Topes:** `--max-turns 40` acota los pasos del agente por ejecución y `timeout-minutes: 10` corta el job por reloj. Un push nuevo al mismo PR cancela la revisión anterior (`concurrency`), para no pagar por un diff que ya no existe.
- **Cada ejecución cuesta:** en cada push a un PR abierto se revisa el PR otra vez. Un PR con muchos pushes son muchas revisiones.
- **Precio:** consulta la [página oficial de precios de la API](https://docs.claude.com/en/docs/about-claude/pricing) o los [planes de suscripción](https://claude.com/pricing). Aquí no se citan cifras a propósito: cambian.
- **Cambiar de modelo:** edita `claude_args` en el workflow, por ejemplo `--model opus` para más profundidad (más caro) o `--model haiku` para menos coste. También acepta un ID completo de modelo. Para gastar menos sin cambiar de modelo, baja `--effort` a `low` o reduce `--max-turns`.

## PRs desde un fork en un repositorio público

En los PRs que vienen de un fork, GitHub **no pasa los secretos** al workflow y el `GITHUB_TOKEN` es de solo lectura. Además, la acción no se ejecuta en PRs de fork por defecto (`allow_fork_prs: false`). Resultado: **esos PRs no se revisan**. El job no llega a publicar nada.

No lo "arregles" cambiando el disparador a `pull_request_target`: ese evento da secretos y permisos de escritura a un job que procesa código y texto de un desconocido, lo que abre la puerta a robar la credencial o a una inyección de prompt. Si hace falta revisar forks, que un mantenedor lo lance a mano después de leer el PR.
