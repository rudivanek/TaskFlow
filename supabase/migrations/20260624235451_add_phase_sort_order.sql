ALTER TABLE phases ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 99;

UPDATE phases SET sort_order = CASE phase
  WHEN 'Kick-Off'               THEN 1
  WHEN 'Deliverables'           THEN 2
  WHEN 'Development'            THEN 3
  WHEN 'Development E-Com'      THEN 4
  WHEN 'Development Projects'   THEN 5
  WHEN 'Testing'                THEN 6
  WHEN 'Review'                 THEN 7
  WHEN 'Domain - Server'        THEN 8
  WHEN 'Training'               THEN 9
  WHEN 'Done'                   THEN 10
  ELSE 99
END;