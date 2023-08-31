CREATE TABLE public.stations (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	latitude numeric(8, 6) NULL,
	longitude numeric(9, 6) NULL,
	CONSTRAINT stations_latitude_longitude_key UNIQUE (latitude, longitude),
	CONSTRAINT stations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.readings (
	id serial4 NOT NULL,
	station_id int4 NOT NULL,
	weather int4 NULL,
	temperature float8 NULL,
	windspeed float8 NULL,
	pressure int4 NULL,
	CONSTRAINT readings_pkey PRIMARY KEY (id),
	CONSTRAINT fk_station FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE
);