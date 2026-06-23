import os
import json
import base64
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq

# ============================================================
# CONFIGURACAO
# Coloque sua chave do Groq aqui
# Obtenha gratuitamente em: https://console.groq.com/keys
# ============================================================
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

NOME_BANCO = "qualidade.db"

app = Flask(__name__, static_folder='.')

# Inicializa o cliente Groq com a chave definida acima
cliente = Groq(api_key=GROQ_API_KEY)

# Modelo com suporte a visao disponivel no Groq
MODELO = "meta-llama/llama-4-scout-17b-16e-instruct"


# ============================================================
# BANCO DE DADOS
# ============================================================

def inicializar_banco():
    # Cria a tabela de pecas se ela ainda nao existir
    conexao = sqlite3.connect(NOME_BANCO)
    cursor = conexao.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pecas (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            nome           TEXT    NOT NULL UNIQUE,
            prompt         TEXT    NOT NULL,
            data_cadastro  TEXT    NOT NULL
        )
    """)
    conexao.commit()
    conexao.close()


# ============================================================
# ROTAS DE ARQUIVOS ESTATICOS
# ============================================================

@app.route('/')
def pagina_inicial():
    return send_from_directory('.', 'index.html')

@app.route('/<path:nome_arquivo>')
def arquivo_estatico(nome_arquivo):
    return send_from_directory('.', nome_arquivo)


# ============================================================
# ROTA: LISTAR PECAS
# ============================================================

@app.route('/api/pecas', methods=['GET'])
def listar_pecas():
    conexao = sqlite3.connect(NOME_BANCO)
    cursor = conexao.cursor()
    cursor.execute("SELECT id, nome, data_cadastro FROM pecas ORDER BY nome")
    pecas = cursor.fetchall()
    conexao.close()
    lista = [{"id": p[0], "nome": p[1], "data_cadastro": p[2]} for p in pecas]
    return jsonify(lista)


# ============================================================
# ROTA: CADASTRAR PECA
# Recebe fotos de pecas aprovadas, envia ao Groq para gerar
# o criterio de qualidade e salva no banco
# ============================================================

@app.route('/api/cadastrar', methods=['POST'])
def cadastrar_peca():
    dados = request.json
    nome_peca = dados.get('nome', '').strip()
    imagens_base64 = dados.get('imagens', [])

    if not nome_peca:
        return jsonify({"erro": "Informe o nome da peca"}), 400

    if len(imagens_base64) < 3:
        return jsonify({"erro": "Envie pelo menos 3 fotos de pecas aprovadas"}), 400

    # Monta a lista de conteudo com as imagens no formato aceito pelo Groq
    conteudo = []
    for imagem in imagens_base64:
        # Garante que a imagem esta no formato data URL completo
        if not imagem.startswith('data:'):
            imagem = 'data:image/jpeg;base64,' + imagem

        conteudo.append({
            "type": "image_url",
            "image_url": {"url": imagem}
        })

    # Adiciona a instrucao de texto ao final das imagens
    conteudo.append({
        "type": "text",
        "text": (
            "Voce e um especialista sênior em controle de qualidade industrial com foco em inspeção visual. "
            "Analise as imagens fornecidas de pecas aprovadas e extraia um criterio de qualidade estruturado. "
            "Organize a resposta exatamente neste formato:\n\n"
            "CRITERIOS CRITICOS (reprovação imediata se descumpridos):\n"
            "- Liste defeitos inaceitaveis como rachaduras, vazamentos, deformacoes estruturais, "
            "contaminacao visivel ou ausencia de componentes.\n\n"
            "CARACTERISTICAS VISUAIS ESPERADAS:\n"
            "- Cor predominante e variacoes aceitaveis\n"
            "- Textura e acabamento superficial\n"
            "- Formato geometrico e proporcoes\n"
            "- Dimensoes estimadas visiveis\n\n"
            "CRITERIOS SECUNDARIOS (geram REVISAR se descumpridos):\n"
            "- Imperfeicoes leves aceitaveis ou que exigem verificacao humana\n\n"
            "OBSERVACOES DO INSPETOR:\n"
            "- Pontos de atencao especificos desta peca que o inspetor deve observar primeiro.\n\n"
            "Seja quantitativo sempre que possivel. "
            "Escreva como se fosse um documento tecnico oficial usado por operadores de fabrica."
        )
    })

    try:
        resposta = cliente.chat.completions.create(
            model=MODELO,
            messages=[{"role": "user", "content": conteudo}],
            max_tokens=1000
        )
        criterio_qualidade = resposta.choices[0].message.content

        # Salva no banco, atualizando se o nome ja existir
        conexao = sqlite3.connect(NOME_BANCO)
        cursor = conexao.cursor()
        cursor.execute("SELECT id FROM pecas WHERE nome = ?", (nome_peca,))
        peca_existente = cursor.fetchone()
        data_atual = datetime.now().strftime("%d/%m/%Y %H:%M")

        if peca_existente:
            cursor.execute(
                "UPDATE pecas SET prompt = ?, data_cadastro = ? WHERE nome = ?",
                (criterio_qualidade, data_atual, nome_peca)
            )
        else:
            cursor.execute(
                "INSERT INTO pecas (nome, prompt, data_cadastro) VALUES (?, ?, ?)",
                (nome_peca, criterio_qualidade, data_atual)
            )

        conexao.commit()
        conexao.close()

        return jsonify({
            "mensagem": f"Peca '{nome_peca}' cadastrada com sucesso",
            "criterio": criterio_qualidade
        })

    except Exception as erro:
        return jsonify({"erro": f"Erro ao processar imagens: {str(erro)}"}), 500


# ============================================================
# ROTA: CLASSIFICAR PECA
# Recebe uma foto nova, busca o criterio no banco e classifica
# ============================================================

@app.route('/api/classificar', methods=['POST'])
def classificar_peca():
    dados = request.json
    nome_peca = dados.get('nome', '').strip()
    imagem_base64 = dados.get('imagem', '')

    if not nome_peca:
        return jsonify({"erro": "Informe o nome da peca"}), 400

    if not imagem_base64:
        return jsonify({"erro": "Envie a imagem da peca para analise"}), 400

    # Busca o criterio de qualidade salvo para esta peca
    conexao = sqlite3.connect(NOME_BANCO)
    cursor = conexao.cursor()
    cursor.execute("SELECT prompt FROM pecas WHERE nome = ?", (nome_peca,))
    resultado = cursor.fetchone()
    conexao.close()

    if not resultado:
        return jsonify({"erro": f"Peca '{nome_peca}' nao encontrada no cadastro"}), 404

    criterio_qualidade = resultado[0]

    # Garante que a imagem esta no formato data URL completo
    if not imagem_base64.startswith('data:'):
        imagem_base64 = 'data:image/jpeg;base64,' + imagem_base64

    instrucao = (
        f"Voce e um inspetor de qualidade industrial rigoroso e criterioso.\n\n"
        f"Criterio de qualidade aprovado para esta peca:\n{criterio_qualidade}\n\n"
        f"Analise a imagem com atencao e compare cada detalhe com o criterio acima.\n\n"
        f"Regras de classificacao obrigatorias:\n"
        f"- APROVADO: a peca atende integralmente todos os criterios. Nenhum defeito visivel.\n"
        f"- REPROVADO: ha qualquer defeito claro como vazamento, mancha, deformacao, dano fisico, "
        f"sujeira, trinca, irregularidade de forma ou descumprimento de qualquer item do criterio. "
        f"Em caso de duvida entre REPROVADO e REVISAR, classifique como REPROVADO.\n"
        f"- REVISAR: use APENAS quando o possivel defeito for minimo, quase imperceptivel e "
        f"pode ser erro da foto como angulo ou iluminacao ruim. Nunca use REVISAR para defeitos visiveis.\n\n"
        f"Seja direto e rigoroso. Na industria e melhor reprovar uma peca boa do que aprovar uma peca ruim.\n\n"
        f"Responda APENAS com JSON no formato abaixo, sem texto adicional:\n"
        f'{{"classificacao": "APROVADO", "justificativa": "motivo objetivo em uma frase"}}'
        )

    try:
        resposta = cliente.chat.completions.create(
            model=MODELO,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": imagem_base64}
                    },
                    {
                        "type": "text",
                        "text": instrucao
                    }
                ]
            }],
            max_tokens=300
        )

        texto_resposta = resposta.choices[0].message.content.strip()

        # Remove marcadores de bloco de codigo se o modelo os incluir
        if texto_resposta.startswith('```'):
            linhas = texto_resposta.split('\n')
            linhas = [l for l in linhas if not l.startswith('```')]
            texto_resposta = '\n'.join(linhas).strip()

        resultado_json = json.loads(texto_resposta)
        return jsonify(resultado_json)

    except json.JSONDecodeError:
        texto = texto_resposta.upper()
        if 'APROVADO' in texto:
            return jsonify({"classificacao": "APROVADO", "justificativa": "Peca aprovada conforme analise da IA."})
        elif 'REPROVADO' in texto:
            return jsonify({"classificacao": "REPROVADO", "justificativa": "Peca reprovada conforme analise da IA."})
        else:
            return jsonify({"classificacao": "REVISAR", "justificativa": "Nao foi possivel determinar. Revise manualmente."})

    except Exception as erro:
        return jsonify({"erro": f"Erro ao classificar peca: {str(erro)}"}), 500


# ============================================================
# INICIALIZACAO
# ============================================================

if __name__ == '__main__':
    inicializar_banco()
    print("Sistema rodando em: http://localhost:5000")
    app.run(debug=True, port=5000)