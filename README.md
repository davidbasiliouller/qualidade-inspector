# Qualidade Inspector

Sistema web de inspeção visual de qualidade industrial com inteligência artificial.

O operador fotografa uma peça na linha de produção e o sistema classifica automaticamente como **APROVADO**, **REPROVADO** ou **REVISAR**, com justificativa gerada pela IA.

---

## Como funciona

**Cadastro de peça (feito uma vez):**
O responsável envia de 3 a 10 fotos de peças aprovadas. A IA analisa as imagens e gera automaticamente um critério detalhado de qualidade, que é salvo no banco de dados.

**Inspeção (uso diário):**
O operador seleciona a peça, envia uma foto e recebe a classificação em segundos.

```
Fotos de peças aprovadas
        ↓
IA gera critério de qualidade
        ↓
Salva no banco de dados
        ↓
Nova foto do operador
        ↓
IA compara com o critério
        ↓
APROVADO / REPROVADO / REVISAR
```

---

## Tecnologias

- Python 3
- Flask
- SQLite
- Groq API (modelo meta-llama/llama-4-scout-17b-16e-instruct)
- HTML, CSS e JavaScript puro

---

## Pré-requisitos

- Python 3.10 ou superior
- Conta gratuita no [Groq](https://console.groq.com) para obter a chave de API

---

## Instalação

Clone o repositório:

```bash
git clone https://github.com/davidbasiliouller/qualidade-inspector.git
cd qualidade-inspector/qualidade
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Crie o arquivo `.env` na pasta `qualidade` com sua chave do Groq:

```
GROQ_API_KEY=sua_chave_aqui
```

Inicie o servidor:

```bash
python app.py
```

Acesse no navegador:

```
http://localhost:5000
```

---

## Estrutura do projeto

```
qualidade/
├── app.py            # Backend Flask com rotas e integração com a IA
├── index.html        # Tela inicial com os dois botões
├── cadastrar.html    # Tela de cadastro de peças
├── classificar.html  # Tela de inspeção e resultado
├── cadastrar.js      # Lógica de upload e cadastro
├── classificar.js    # Lógica de inspeção e exibição do resultado
├── style.css         # Estilos organizados por seção
└── requirements.txt  # Dependências do projeto
```

---

## Desenvolvido para

Circuito SIS 2026 — SENAI São Bento do Sul  
Curso Técnico em Desenvolvimento de Sistemas
