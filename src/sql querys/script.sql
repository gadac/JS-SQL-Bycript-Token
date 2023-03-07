create database dindin;

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  email VARCHAR(50) UNIQUE NOT NULL,
  senha text NOT NULL
);

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(50) NOT NULL
);

CREATE TABLE transacoes (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(50) NOT NULL,
  valor NUMERIC(15) NOT NULL,
  data DATE NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(10) NOT NULL
);

INSERT INTO categorias (descricao) VALUES
('Alimentação'),
('Assinaturas e Serviços'),
('Casa'),
('Mercado'),
('Cuidados Pessoais'),
('Educação'),
('Família'),
('Lazer'),
('Pets'),
('Presentes'),
('Roupas'),
('Saúde'),
('Transporte'),
('Salário'),
('Vendas'),
('Outras receitas'),
('Outras despesas');