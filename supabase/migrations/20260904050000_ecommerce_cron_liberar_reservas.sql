-- ============================================================================
-- Fase 5: cron que libera reservas de piezas abandonadas en el ecommerce.
-- ============================================================================
-- La Edge Function liberar-reservas-vencidas ya está desplegada con
-- verify_jwt=false (ver supabase/config.toml) precisamente para poder
-- invocarla así, sin secretos embebidos en el job de cron: no recibe ningún
-- input sensible, solo dispara una limpieza idempotente
-- (ecommerce_liberar_reservas_vencidas), así que el riesgo de dejarla
-- pública es bajo (peor caso: alguien la llama de más, no pasa nada porque
-- es idempotente).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Re-ejecutar esta migración no debe duplicar el job (unschedule(text) no
-- tira error si el job no existe todavía, solo devuelve false).
SELECT cron.unschedule('ecommerce-liberar-reservas-vencidas')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ecommerce-liberar-reservas-vencidas');

SELECT cron.schedule(
    'ecommerce-liberar-reservas-vencidas',
    '*/10 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://yuyjoupristotpnnblva.supabase.co/functions/v1/liberar-reservas-vencidas',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
