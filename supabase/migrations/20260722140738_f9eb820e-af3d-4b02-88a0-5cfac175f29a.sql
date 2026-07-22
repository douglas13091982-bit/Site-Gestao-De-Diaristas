CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $seed$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- will be filled below
      (NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text[], NULL::text, NULL::numeric, NULL::text, NULL::text, NULL::numeric, NULL::int, NULL::boolean, NULL::boolean)
    ) AS t(id,email,full_name,phone,city,city_slug,bio,experience,specialties,regions,hourly_rate,pix_key,profile_photo,rating,total_bookings,is_verified,is_available)
    WHERE FALSE
  LOOP NULL; END LOOP;
END $seed$;

-- Insert auth users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, id, 'authenticated', 'authenticated', email,
       crypt('imported-'||substr(id::text,1,8), gen_salt('bf')),
       now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
FROM (VALUES
('ebb32794-f3d4-475f-b3f1-584848534db6'::uuid,'kailainecarvalho.97@import.gersepa.local'),
('5df67fb1-e316-474f-8654-9872642b0c64'::uuid,'patrciaklug.96@import.gersepa.local'),
('27d49f79-c6ae-449e-9b28-29339916bbde'::uuid,'nilceleiaamorimmarti.95@import.gersepa.local'),
('7e67b883-9b03-4ec0-8315-0adab805db10'::uuid,'nilzaarruda.94@import.gersepa.local'),
('de235178-6790-474a-b340-b29a687e3d94'::uuid,'leticiamenaramos.93@import.gersepa.local'),
('9c527cca-7271-4531-ae58-bed7fa815a64'::uuid,'karenkleidilopespere.92@import.gersepa.local'),
('12689314-46d5-46b8-bb50-79e403da310f'::uuid,'anapaulapiveta.91@import.gersepa.local'),
('b1428a0c-88e5-44f5-9028-9145ab7046df'::uuid,'florguayanabravoprez.90@import.gersepa.local'),
('24aa5515-0dfd-4f37-88a0-6167da21c57b'::uuid,'luciadeftimadeolivei.89@import.gersepa.local'),
('3e5e266b-792c-4cc4-b74d-1da66e49e766'::uuid,'elizangelaconceicao.88@import.gersepa.local'),
('e501a24f-5472-4e12-916c-052736725056'::uuid,'palomalima.87@import.gersepa.local'),
('fcb3d1a0-a0e6-4601-b1f6-cb9ac3e8737e'::uuid,'jadilmamariasantanad.86@import.gersepa.local'),
('c9fc32b1-7759-44f8-a074-2afc91ec4510'::uuid,'maiara.85@import.gersepa.local'),
('655f9708-c53f-4278-9c0c-54f81f2453c0'::uuid,'bernarda.84@import.gersepa.local'),
('01e03a46-3e0b-47c5-bf16-249f30c1c417'::uuid,'ariellealeixo.83@import.gersepa.local'),
('c893307f-1f6d-4c22-bfb8-cd6c3615aea9'::uuid,'marcianapimentel.80@import.gersepa.local'),
('597e5129-00a9-4537-ab4a-4f554752800c'::uuid,'schirleyluzdossantos.78@import.gersepa.local'),
('09e8bdaa-96a0-437d-9904-ec5a5362caf7'::uuid,'letciacamargosantos.77@import.gersepa.local'),
('d4311c4c-a4d7-4240-8883-4f631007f85e'::uuid,'silviabeatriztapajos.76@import.gersepa.local'),
('5fe91854-e5f8-4954-8575-8cc23896b0db'::uuid,'valdemirafreitasdeol.75@import.gersepa.local'),
('a74d906a-4edd-4f88-b637-32338efdc0dc'::uuid,'sheilabruchpereirara.74@import.gersepa.local'),
('409295fa-91fc-4324-8bf4-79269b718b09'::uuid,'jucinildanunesdasilv.73@import.gersepa.local'),
('7495b15d-fb01-4a54-82d6-224cd235baa0'::uuid,'cristianeamaranteper.72@import.gersepa.local'),
('766c7b92-8863-4084-a549-bfd5b018484d'::uuid,'evaneideconceiodossa.71@import.gersepa.local'),
('6a966b35-55f8-48ca-aa70-5c66b9eaf560'::uuid,'mariadosprazeresmarc.70@import.gersepa.local'),
('0e8d4cb6-a421-42ce-bf7c-86db4115b247'::uuid,'elibethelicrodrguez.69@import.gersepa.local'),
('969cf8da-a941-49c4-b7b0-4d18328571ff'::uuid,'sandracristianaandr.68@import.gersepa.local'),
('b4ca9ab2-dcf0-407b-8ba4-af61fb923d9d'::uuid,'noemidasilvajose.67@import.gersepa.local'),
('753e22ec-f504-4f32-8681-b3a9cf37bbfd'::uuid,'nilsp194gmailcom.66@import.gersepa.local'),
('537258a8-528b-4a17-b92a-2f6f6c117f51'::uuid,'natiellyminksviana.65@import.gersepa.local'),
('b5f0effa-82be-428f-b3db-b3d0623c878a'::uuid,'samarademorais.64@import.gersepa.local'),
('906fd8a3-eb21-4500-b2d7-1c1c40604cf3'::uuid,'renatacavalheiro.63@import.gersepa.local'),
('b7b3212e-a629-44f1-b7c5-be29133adf99'::uuid,'girleiroza.62@import.gersepa.local'),
('cf077192-2255-422c-a848-f628a83bf0b3'::uuid,'luziaaparecidadefalc.61@import.gersepa.local'),
('0f1dbc85-8d51-4c78-b4ec-8424960dd4d8'::uuid,'cildajoseanapiovesan.60@import.gersepa.local'),
('edde3121-13c0-4507-9fcb-5189180df127'::uuid,'gabriellapiresmaciel.59@import.gersepa.local'),
('5e93bca4-75f4-46a5-bf0a-edf98d22b39c'::uuid,'yunetkyvidalfreyre.58@import.gersepa.local'),
('4cc6a391-4778-4939-a8ff-10a140ca14c0'::uuid,'angelicasaugustingma.57@import.gersepa.local'),
('64be1ec3-0696-449a-be86-e2decc93facf'::uuid,'vivianeaparecidanati.56@import.gersepa.local'),
('7935abdf-d160-400e-8562-03d46ea3ad3d'::uuid,'raquelbagdzinski.55@import.gersepa.local')
) AS s(id,email)
ON CONFLICT (id) DO NOTHING;