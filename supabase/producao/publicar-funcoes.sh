#!/bin/sh
# PRODUÇÃO: publica as 10 funções do app no projeto do site, a partir dos arquivos deste repositório.
# Rodar DEPOIS do 001_app_do_aluno.sql (sem as tabelas, as funções respondem erro).
# Antes, uma vez: npx supabase@latest login   (abre o navegador para autorizar)
# Não mexe nas funções do site nem na bright-service: publica só as app-* pelo nome.
set -e
cd "$(dirname "$0")/.."   # pasta supabase/
REF=miucfiiporxhvvbefonh

for f in app-api app-house app-requests app-assistant app-community app-feedback app-events app-events-sync app-push; do
  echo "== $f"
  npx supabase@latest functions deploy "$f" --project-ref "$REF" --use-api --no-verify-jwt
done

# A do painel exige o login da equipe (JWT), como no dev.
echo "== app-admin"
npx supabase@latest functions deploy app-admin --project-ref "$REF" --use-api

echo "Pronto: 10 funções publicadas em $REF."
