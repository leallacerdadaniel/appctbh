-- appctbh: dados de teste FICTÍCIOS de pagamento (exemplo), tarefas e um aviso.
update public.app_payment_info set beneficiary = 'Chez Toi BH (exemplo)', document = '00.000.000/0001-00',
  pix_key = '00.000.000/0001-00', pix_key_type = 'cnpj', bank = 'Banco exemplo (000)', agency = '0001', account = '00000-0',
  notes = '{"fr":"Envoyez le reçu sur WhatsApp après le paiement.","en":"Send the receipt on WhatsApp after paying.","pt":"Envie o comprovante pelo WhatsApp depois de pagar."}'
where id;

insert into public.app_chores (rental_id, emoji, name, rotation, start_week, created_by) values
  ('00000000-0000-4000-a000-000000000010', '🗑️', 'Sortir les poubelles',
   array['00000000-0000-4000-a000-000000000101','00000000-0000-4000-a000-000000000102','00000000-0000-4000-a000-000000000103']::uuid[],
   (date_trunc('week', current_date) - interval '3 weeks')::date, '00000000-0000-4000-a000-000000000101'),
  ('00000000-0000-4000-a000-000000000010', '🍽️', 'Vaisselle commune',
   array['00000000-0000-4000-a000-000000000102','00000000-0000-4000-a000-000000000103','00000000-0000-4000-a000-000000000101']::uuid[],
   (date_trunc('week', current_date) - interval '3 weeks')::date, '00000000-0000-4000-a000-000000000101');

insert into public.app_notices (audience, rental_id, title, body) values
  ('rental', '00000000-0000-4000-a000-000000000010',
   '{"fr":"Coupure d’eau jeudi","en":"Water cut on Thursday","pt":"Falta de água na quinta"}',
   '{"fr":"Le syndic coupe l’eau jeudi de 9 h à 12 h pour l’entretien de la citerne.","en":"The building cuts the water on Thursday from 9 am to noon for tank maintenance.","pt":"O condomínio corta a água na quinta das 9h às 12h para manutenção da caixa."}');
