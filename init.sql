CREATE TABLE public.users (
    id serial4 NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    firstname varchar(255) NOT NULL,
    lastname varchar(255) NOT NULL,
    password varchar(255) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.stations (
    id serial4 NOT NULL,
    "name" varchar NOT NULL,
    latitude numeric(8, 6) NULL,
    longitude numeric(9, 6) NULL,
    user_fk int4,
    CONSTRAINT stations_latitude_longitude_key UNIQUE (latitude, longitude),
    CONSTRAINT stations_pkey PRIMARY KEY (id),
    CONSTRAINT fk_user FOREIGN KEY (user_fk) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.measurements (
	id serial4 NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
	station_id int4 NOT NULL,
	weather int4 NULL,
	temp float8 NULL,
	windspeed float8 NULL,
    winddirection int4 NULL,
	pressure int4 NULL,
	CONSTRAINT measurements_pkey PRIMARY KEY (id),
	CONSTRAINT fk_station FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE
);
