-- appctbh: catálogo de extras e espaço gourmet de EXEMPLO (preços a definir pela Chez Toi).
-- Pode rodar de novo: apaga e recria o catálogo e o gourmet do apartamento de teste.

delete from public.app_service_catalog;

insert into public.app_service_catalog (category, emoji, name, description, unit, price_cents, lead_time_hours, allows_quantity, max_quantity, sort) values
  ('cleaning', '🧽',
   '{"fr":"Ménage supplémentaire","en":"Extra cleaning"}',
   '{"fr":"Deux heures de ménage de votre chambre et des espaces communs, en plus du passage hebdomadaire.","en":"Two hours of cleaning in your room and shared areas, on top of the weekly visit."}',
   '{"fr":"par passage","en":"per visit"}', 12000, 48, false, 1, 10),
  ('laundry', '🧺',
   '{"fr":"Laverie","en":"Laundry"}',
   '{"fr":"Nous récupérons le sac à l’appartement et le rapportons lavé, séché et plié sous 48 h.","en":"We pick the bag up at the apartment and bring it back washed, dried and folded within 48 h."}',
   '{"fr":"par sac","en":"per bag"}', 4500, 24, true, 6, 20),
  ('laundry', '🛏️',
   '{"fr":"Changement des draps","en":"Bedding change"}',
   '{"fr":"Draps et serviettes propres, lit refait.","en":"Fresh sheets and towels, bed made."}',
   '{"fr":"par lit","en":"per bed"}', 4000, 24, true, 4, 30),
  ('chef', '👩‍🍳',
   '{"fr":"Chef à domicile","en":"Private chef"}',
   '{"fr":"Un dîner mineiro préparé chez vous : entrée, plat et dessert. Courses comprises.","en":"A Minas Gerais dinner cooked at home: starter, main and dessert. Groceries included."}',
   '{"fr":"par personne","en":"per person"}', 9000, 72, true, 12, 40),
  ('transfer', '✈️',
   '{"fr":"Transfert aéroport (Confins)","en":"Airport transfer (Confins)"}',
   '{"fr":"Chauffeur de confiance entre l’appartement et l’aéroport de Confins, bagages compris.","en":"A trusted driver between the apartment and Confins airport, luggage included."}',
   '{"fr":"par trajet","en":"per trip"}', 18000, 24, false, 1, 50);

update public.app_apartment_info
set building_info = building_info || jsonb_build_object('gourmet', jsonb_build_object(
  'name', jsonb_build_object('fr', 'Espace gourmet (toit)', 'en', 'Gourmet space (rooftop)'),
  'capacity', 20,
  'open_from', '10:00',
  'open_until', '22:00',
  'max_hours', 4,
  'rules', jsonb_build_object(
    'fr', 'Une réservation par appartement, 4 heures maximum. Rendre l’espace propre ; le syndic retient la caution en cas de dégâts.',
    'en', 'One booking per apartment, 4 hours max. Leave it clean; the building keeps the deposit if anything is damaged.')))
where apartment_id = '00000000-0000-4000-a000-000000000001';
