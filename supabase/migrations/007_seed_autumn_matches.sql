-- Seed podzimní zápasy 2025/2026
-- Datumy jsou placeholder (soboty podzim 2025), doplní se ručně v adminu
-- Střelci se doplní ručně
-- Domácí zápasy Dolan jsou is_home = true

INSERT INTO match_results (date, opponent, score_home, score_away, is_home, competition, season) VALUES
-- Podzim
('2025-08-23T15:00:00+02:00', 'Červený Kostelec B', 2, 1, true,  'Okresní přebor', '2025/2026'),
('2025-08-30T15:00:00+02:00', 'Deštné/Nové Město B', 2, 5, false, 'Okresní přebor', '2025/2026'),
('2025-09-06T15:00:00+02:00', 'Zábrodí',            2, 2, true,  'Okresní přebor', '2025/2026'),
('2025-09-13T15:00:00+02:00', 'Hronov',             3, 2, false, 'Okresní přebor', '2025/2026'),
('2025-09-20T15:00:00+02:00', 'Česká Skalice B',    0, 2, true,  'Okresní přebor', '2025/2026'),
('2025-10-04T15:00:00+02:00', 'Hejtmánkovice',      2, 2, false, 'Okresní přebor', '2025/2026'),
('2025-10-11T15:00:00+02:00', 'Velká Jesenice',     1, 2, false, 'Okresní přebor', '2025/2026'),
('2025-10-18T15:00:00+02:00', 'Machov',             2, 2, true,  'Okresní přebor', '2025/2026'),
('2025-10-25T14:00:00+02:00', 'Babí',               1, 2, false, 'Okresní přebor', '2025/2026'),
('2025-11-01T14:00:00+01:00', 'Velké Poříčí',       4, 2, true,  'Okresní přebor', '2025/2026'),
('2025-11-08T14:00:00+01:00', 'Stárkov',            2, 2, false, 'Okresní přebor', '2025/2026'),
('2025-11-15T14:00:00+01:00', 'Police B',           2, 4, true,  'Okresní přebor', '2025/2026'),
-- Jaro
('2026-03-21T15:00:00+01:00', 'Červený Kostelec B', 7, 0, true,  'Okresní přebor', '2025/2026');
