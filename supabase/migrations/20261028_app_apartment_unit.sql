-- App CTBH: número do apartamento (ex.: "Apto 302"), cadastrado no admin › Apartamentos
-- e mostrado no app junto do endereço. O Wi-Fi já tinha colunas (wifi_name, wifi_password).
-- app_home_for já devolve a linha inteira de app_apartment_info, então não precisa mudar.
alter table public.app_apartment_info add column if not exists unit_number text;
