-- Script para borrar toda la información de la base de datos sin afectar la estructura
-- Utiliza CASCADE para respetar las llaves foráneas y borra los datos de todas las tablas en el esquema 'public'.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE;';
    END LOOP;
END $$;;
