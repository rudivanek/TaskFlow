UPDATE phases SET sort_order = CASE phase
  WHEN 'Kick-Off'             THEN 1
  WHEN 'Deliverables'         THEN 2
  WHEN 'Development'          THEN 3
  WHEN 'Development E-Com'    THEN 4
  WHEN 'Development Projects' THEN 5
  WHEN 'Testing'              THEN 6
  WHEN 'Review'               THEN 7
  WHEN 'Clean up'             THEN 8
  WHEN 'Domain - Server'      THEN 9
  WHEN 'Training'             THEN 10
  WHEN 'Done'                 THEN 11
  ELSE 99
END;