-- Correct only catalogue copy that has been explicitly approved. The fully
-- English circuit is deliberately not translated here: its French wording
-- must be authored and approved in the back office first.

UPDATE tour_types
SET name = 'Une nuitée en bivouac à Sabria, Tunisie',
    description = 'Découvrez une expérience inoubliable lors de notre excursion d''une nuitée en bivouac dans le désert, au départ du campement Dunes Insolites à Sabria, Kébili, Tunisie.'
WHERE slug = 'bivouac-desert-tunisie';

UPDATE accommodation_types
SET name = 'Tente de camping simple'
WHERE slug = 'tente-bivouac';

UPDATE extras
SET name = 'Balade à dos de dromadaire'
WHERE slug = 'camel-trek';

UPDATE extras
SET name = 'Quad',
    description = 'Session de quad de 30 minutes dans le désert autour du campement.'
WHERE slug = 'quad-desert';
