-- 006 (produção) / 029 (appctbh): as fotos do apartamento no Início do app (27/11/2026, pedido do Daniel: "se
-- conseguirmos puxar do Supabase algumas fotos do apto, seria ideal"). app_home_for passa a mandar, além da capa
-- (`photo`), as primeiras 12 fotos da vitrine do site (`photos`, de apartments.images: links públicos do storage do
-- site, as mesmas que qualquer visitante vê). A função só ganha esse campo: o resto fica igual (troca no texto atual).

do $$
declare
  d text := pg_get_functiondef('public.app_home_for(uuid)'::regprocedure);
begin
  if position('''photos''' in d) = 0 then
    d := replace(d, '''photo'', a.card_image_url',
                 '''photo'', a.card_image_url, ''photos'', to_jsonb(coalesce(a.images[1:12], ''{}''::text[]))');
    if position('''photos''' in d) = 0 then
      raise exception 'app_home_for mudou: não achei o campo photo para acrescentar as fotos';
    end if;
    execute d;
  end if;
end;
$$;
