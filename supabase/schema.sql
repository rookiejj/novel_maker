--
-- PostgreSQL database dump
--

\restrict oEIlmyLT7fiCFy9DBq5GYJi9hg9EsgWo0zAdaE2s3XMq62wyhs8WklxITni0sG8

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: active_series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_series (
    user_id uuid NOT NULL,
    series_id text
);


--
-- Name: mood_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mood_records (
    id text NOT NULL,
    user_id uuid NOT NULL,
    date text NOT NULL,
    emoji text NOT NULL,
    label text NOT NULL
);


--
-- Name: novels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.novels (
    id text NOT NULL,
    user_id uuid NOT NULL,
    series_id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    config jsonb NOT NULL,
    base_mood text NOT NULL,
    created_at bigint NOT NULL,
    illustration_url text,
    illustration_status text DEFAULT 'pending'::text NOT NULL
);


--
-- Name: series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.series (
    id text NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    genre text NOT NULL,
    protagonist_name text,
    protagonist_gender text NOT NULL,
    total_episodes integer NOT NULL,
    episode_count integer DEFAULT 0,
    last_options jsonb,
    created_at bigint NOT NULL
);


--
-- Name: story_bibles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_bibles (
    novel_id text NOT NULL,
    user_id uuid NOT NULL,
    series_id text NOT NULL,
    title text NOT NULL,
    date text NOT NULL,
    mood text NOT NULL,
    ending text NOT NULL,
    threads jsonb DEFAULT '[]'::jsonb NOT NULL,
    new_characters jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: weather_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weather_records (
    id text NOT NULL,
    user_id uuid NOT NULL,
    date text NOT NULL,
    weather text NOT NULL
);


--
-- Name: world_bibles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_bibles (
    series_id text NOT NULL,
    user_id uuid NOT NULL,
    genre text NOT NULL,
    world_setting text NOT NULL,
    characters jsonb DEFAULT '[]'::jsonb NOT NULL,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at text NOT NULL
);


--
-- Name: active_series active_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_series
    ADD CONSTRAINT active_series_pkey PRIMARY KEY (user_id);


--
-- Name: mood_records mood_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_records
    ADD CONSTRAINT mood_records_pkey PRIMARY KEY (id);


--
-- Name: mood_records mood_records_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_records
    ADD CONSTRAINT mood_records_user_id_date_key UNIQUE (user_id, date);


--
-- Name: novels novels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.novels
    ADD CONSTRAINT novels_pkey PRIMARY KEY (id);


--
-- Name: series series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series
    ADD CONSTRAINT series_pkey PRIMARY KEY (id);


--
-- Name: story_bibles story_bibles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_bibles
    ADD CONSTRAINT story_bibles_pkey PRIMARY KEY (novel_id);


--
-- Name: weather_records weather_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_records
    ADD CONSTRAINT weather_records_pkey PRIMARY KEY (id);


--
-- Name: weather_records weather_records_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_records
    ADD CONSTRAINT weather_records_user_id_date_key UNIQUE (user_id, date);


--
-- Name: world_bibles world_bibles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bibles
    ADD CONSTRAINT world_bibles_pkey PRIMARY KEY (series_id);


--
-- Name: active_series active_series_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_series
    ADD CONSTRAINT active_series_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE SET NULL;


--
-- Name: active_series active_series_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_series
    ADD CONSTRAINT active_series_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mood_records mood_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_records
    ADD CONSTRAINT mood_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: novels novels_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.novels
    ADD CONSTRAINT novels_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE CASCADE;


--
-- Name: novels novels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.novels
    ADD CONSTRAINT novels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: series series_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series
    ADD CONSTRAINT series_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_bibles story_bibles_novel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_bibles
    ADD CONSTRAINT story_bibles_novel_id_fkey FOREIGN KEY (novel_id) REFERENCES public.novels(id) ON DELETE CASCADE;


--
-- Name: story_bibles story_bibles_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_bibles
    ADD CONSTRAINT story_bibles_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE CASCADE;


--
-- Name: story_bibles story_bibles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_bibles
    ADD CONSTRAINT story_bibles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weather_records weather_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_records
    ADD CONSTRAINT weather_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: world_bibles world_bibles_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bibles
    ADD CONSTRAINT world_bibles_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE CASCADE;


--
-- Name: world_bibles world_bibles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bibles
    ADD CONSTRAINT world_bibles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: active_series; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.active_series ENABLE ROW LEVEL SECURITY;

--
-- Name: mood_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mood_records ENABLE ROW LEVEL SECURITY;

--
-- Name: novels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

--
-- Name: series; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

--
-- Name: story_bibles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_bibles ENABLE ROW LEVEL SECURITY;

--
-- Name: weather_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weather_records ENABLE ROW LEVEL SECURITY;

--
-- Name: world_bibles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_bibles ENABLE ROW LEVEL SECURITY;

--
-- Name: active_series 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.active_series USING ((auth.uid() = user_id));


--
-- Name: mood_records 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.mood_records USING ((auth.uid() = user_id));


--
-- Name: novels 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.novels USING ((auth.uid() = user_id));


--
-- Name: series 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.series USING ((auth.uid() = user_id));


--
-- Name: story_bibles 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.story_bibles USING ((auth.uid() = user_id));


--
-- Name: weather_records 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.weather_records USING ((auth.uid() = user_id));


--
-- Name: world_bibles 본인 데이터만; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "본인 데이터만" ON public.world_bibles USING ((auth.uid() = user_id));


--
-- PostgreSQL database dump complete
--

\unrestrict oEIlmyLT7fiCFy9DBq5GYJi9hg9EsgWo0zAdaE2s3XMq62wyhs8WklxITni0sG8

