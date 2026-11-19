#!/usr/bin/env bash
#
# Despliegue del change add-task-list en Ubuntu Server.
#
# Único script que escribe en la base de datos en este change: la migración que
# crea la tabla `tasks`. Este script la envuelve con copia de seguridad,
# verificación y reversión, y se puede repetir sin efectos (idempotente).
#
# Uso (desde cualquier sitio):
#   deploy/deploy-add-task-list.sh deploy     # preflight → backup → migrar → verificar
#   deploy/deploy-add-task-list.sh verify     # solo comprueba el estado
#   deploy/deploy-add-task-list.sh rollback   # restaura la última copia de seguridad
#
# Variables (todas opcionales):
#   APP_DIR     raíz del backend ya desplegado. Por defecto: <repo>/backend.
#               Si existe $APP_DIR/build/ace.js, se usa el build de producción.
#   DB_PATH     fichero SQLite que usa la app. Por defecto: <dir de ace>/tmp/db.sqlite3
#   BACKUP_DIR  dónde guardar copias. Por defecto: $APP_DIR/../backups
#   SERVICE     unidad systemd de la API (p. ej. flowsync-api). Si se indica, se
#               para antes de escribir y se arranca al final.

set -euo pipefail

MIGRATION='database/migrations/1795055141950_create_tasks_table'
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-$REPO_DIR/backend}"

# El build de producción de AdonisJS vive en build/; en un clon de desarrollo, ace está en la raíz.
if [[ -f "$APP_DIR/build/ace.js" ]]; then ACE_DIR="$APP_DIR/build"; else ACE_DIR="$APP_DIR"; fi

# La app abre la base en app.tmpPath('db.sqlite3'), relativo a donde corre ace.
# DB_PATH tiene que apuntar a ese mismo fichero, o se verificaría otro.
DB_PATH="${DB_PATH:-$ACE_DIR/tmp/db.sqlite3}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/../backups}"
SERVICE="${SERVICE:-}"
LAST_BACKUP_FILE="$BACKUP_DIR/.last-add-task-list-backup"

step() { printf '\n▶ [%s/%s] %s\n' "$1" "$2" "$3"; }
ok()   { printf '  ✅ %s\n' "$1"; }
fail() { printf '  ❌ %s\n' "$1" >&2; exit 1; }

sql() { sqlite3 -batch -noheader "$DB_PATH" "$1"; }

service_stop()  { [[ -n "$SERVICE" ]] && sudo systemctl stop "$SERVICE"  && ok "servicio $SERVICE parado"   || true; }
service_start() { [[ -n "$SERVICE" ]] && sudo systemctl start "$SERVICE" && ok "servicio $SERVICE arrancado" || true; }

migration_applied() { [[ "$(sql "select count(*) from adonis_schema where name = '$MIGRATION';")" == "1" ]]; }

preflight() {
  command -v node    >/dev/null || fail 'falta node (se necesita Node.js 24 o superior)'
  command -v sqlite3 >/dev/null || fail 'falta sqlite3: sudo apt install sqlite3'
  local major; major="$(node -p 'process.versions.node.split(".")[0]')"
  (( major >= 24 )) || fail "Node.js $major es demasiado antiguo: se necesita 24 o superior"
  [[ -f "$ACE_DIR/ace.js" || -f "$ACE_DIR/ace" ]] || fail "no encuentro ace en $ACE_DIR"
  [[ -f "$DB_PATH" ]] || fail "no existe la base de datos $DB_PATH (¿se corrió el setup inicial?)"
  [[ "$(sql "select count(*) from sqlite_master where name = 'users';")" == "1" ]] \
    || fail 'la base de datos no tiene la tabla users: este change necesita las migraciones de cuentas'
  ok "node $(node -v), sqlite3 y base de datos en $DB_PATH"
}

backup() {
  mkdir -p "$BACKUP_DIR"
  local file; file="$BACKUP_DIR/db-before-add-task-list-$(date +%Y%m%d-%H%M%S).sqlite3"
  # .backup hace una copia consistente aunque haya escrituras en curso.
  sqlite3 "$DB_PATH" ".backup '$file'"
  [[ "$(sqlite3 "$file" 'pragma integrity_check;')" == "ok" ]] || fail "la copia $file no pasa integrity_check"
  echo "$file" > "$LAST_BACKUP_FILE"
  ok "copia de seguridad en $file"
}

migrate() {
  (cd "$ACE_DIR" && node ace migration:run --force)
  ok 'migraciones aplicadas'
}

verify() {
  migration_applied || fail "la migración $MIGRATION no consta en adonis_schema"
  local cols; cols="$(sql "select group_concat(name, ',') from (select name from pragma_table_info('tasks') order by name);")"
  [[ "$cols" == "assignee_id,created_at,id,status,title,updated_at" ]] \
    || fail "la tabla tasks no tiene las columnas esperadas (tiene: ${cols:-ninguna})"
  local bad; bad="$(sql "select count(*) from tasks where status not in ('pending','in_progress','done');")"
  [[ "$bad" == "0" ]] || fail "$bad tareas con un estado fuera del conjunto cerrado"
  ok 'tabla tasks con sus 6 columnas, sin fecha de vencimiento, y estados válidos'
}

cmd_deploy() {
  local total=5
  step 1 $total 'Comprobaciones previas'; preflight
  if migration_applied; then
    step 2 $total 'Copia de seguridad'; ok 'la migración ya estaba aplicada: no se escribe nada'
    step 3 $total 'Parar el servicio';  ok 'no hace falta'
    step 4 $total 'Migrar';             ok 'nada que migrar (idempotente)'
  else
    step 2 $total 'Copia de seguridad'; backup
    step 3 $total 'Parar el servicio';  service_stop
    step 4 $total 'Migrar'
    if ! migrate || ! verify; then
      printf '\n  ⚠️  Fallo al migrar o verificar: restaurando la copia de seguridad.\n' >&2
      cmd_rollback
      exit 1
    fi
  fi
  step 5 $total 'Verificar y arrancar'; verify; service_start
  printf '\n✅ add-task-list desplegado.\n'
}

cmd_verify() { preflight; verify; }

cmd_rollback() {
  [[ -f "$LAST_BACKUP_FILE" ]] || fail 'no hay copia registrada de este despliegue: nada que restaurar'
  local file; file="$(cat "$LAST_BACKUP_FILE")"
  [[ -f "$file" ]] || fail "la copia registrada $file no existe"
  service_stop
  cp "$file" "$DB_PATH"
  ok "base de datos restaurada desde $file"
  migration_applied && fail 'tras restaurar, la migración sigue constando: revisa la copia' || ok 'la tabla tasks ya no consta'
  service_start
  printf '\n↩️  Reversión completada.\n'
}

case "${1:-}" in
  deploy)   cmd_deploy ;;
  verify)   cmd_verify ;;
  rollback) cmd_rollback ;;
  *) echo "Uso: $0 {deploy|verify|rollback}" >&2; exit 2 ;;
esac
