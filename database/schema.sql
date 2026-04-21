-- SafeCity Alert Platform
-- Database Schema

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(100),
    password_hash TEXT,
    rol VARCHAR(20) DEFAULT 'ciudadano'
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    icono VARCHAR(50),
    color VARCHAR(20)
);

CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200),
    descripcion TEXT,
    tipo VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'activa',
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),
    categoria_id INTEGER REFERENCES categorias(id)
);

CREATE TABLE votos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alerta_id INTEGER REFERENCES alertas(id),
    usuario_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE historial_alertas (
    id SERIAL PRIMARY KEY,
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alerta_id INTEGER REFERENCES alertas(id)
);

-- Enable PostGIS
CREATE EXTENSION postgis;

-- Sample data
INSERT INTO categorias (nombre, icono, color) VALUES
('Hueco vial', '🕳️', '#FF5733'),
('Inundación', '🌊', '#3498DB'),
('Riesgo eléctrico', '⚡', '#F1C40F'),
('Inseguridad', '🚨', '#E74C3C'),
('Accidente', '🚗', '#E67E22');