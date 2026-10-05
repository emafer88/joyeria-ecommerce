-- ============================================================================
-- Quitar el costo de las notas viejas del historial de piezas.
--
-- Hasta 20261006120000_ocultar_costo.sql, ajustar_pieza escribía en
-- movimientos_piezas.notas "costo anterior->nuevo", y esas notas las lee todo
-- el personal. Las nuevas ya no lo llevan; esto limpia las que quedaron
-- (mismo formato que las nuevas: "ajuste: peso a->b, precio c->d. ...").
-- En todas las afectadas el costo no había cambiado, no se pierde historia.
-- ============================================================================
UPDATE public.movimientos_piezas
   SET notas = regexp_replace(notas, 'costo [^,]*->[^,]*, ', '')
 WHERE notas ~ 'costo [^,]*->[^,]*, ';
