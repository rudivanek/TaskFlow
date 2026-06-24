
-- Seed phases
INSERT INTO public.phases (phase, sort_order) VALUES
  ('Planning', 1),
  ('Design', 2),
  ('Development', 3),
  ('Testing', 4),
  ('Deployment', 5);

-- Seed statuses
INSERT INTO public.statuses (status, sort_order) VALUES
  ('Not Started', 1),
  ('In Progress', 2),
  ('In Review', 3),
  ('Blocked', 4),
  ('Done', 5);

-- Seed responsibles
INSERT INTO public.responsibles (responsible, sort_order) VALUES
  ('Team Lead', 1),
  ('Developer', 2),
  ('Designer', 3),
  ('QA Engineer', 4),
  ('Product Manager', 5);
