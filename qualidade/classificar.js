// Aguarda o HTML carregar completamente antes de executar o script
document.addEventListener('DOMContentLoaded', function () {

    // Referencia aos elementos da pagina
    var selecaoPeca = document.getElementById('selecao-peca');
    var inputFoto = document.getElementById('input-foto-classificar');
    var previewContainer = document.getElementById('preview-classificar');
    var imagemPreview = document.getElementById('imagem-preview');
    var botaoRemoverFoto = document.getElementById('botao-remover-foto');
    var botaoClassificar = document.getElementById('botao-classificar');
    var carregamento = document.getElementById('carregamento');
    var formulario = document.getElementById('formulario-classificacao');
    var resultadoContainer = document.getElementById('resultado-classificacao');
    var badgeResultado = document.getElementById('badge-resultado');
    var justificativaResultado = document.getElementById('justificativa-resultado');
    var botaoNovaClassificacao = document.getElementById('botao-nova-classificacao');

    // Guarda o arquivo de imagem selecionado
    var arquivoSelecionado = null;


    // Carrega a lista de pecas cadastradas ao abrir a pagina
    carregarPecasCadastradas();


    // Busca as pecas no backend e preenche o select
    function carregarPecasCadastradas() {
        fetch('/api/pecas')
        .then(function (resposta) {
            return resposta.json();
        })
        .then(function (pecas) {
            // Limpa o select e adiciona a opcao padrao
            selecaoPeca.innerHTML = '';

            if (pecas.length === 0) {
                selecaoPeca.innerHTML = '<option value="">Nenhuma peca cadastrada ainda</option>';
                return;
            }

            var opcaoPadrao = document.createElement('option');
            opcaoPadrao.value = '';
            opcaoPadrao.textContent = 'Selecione uma peca...';
            selecaoPeca.appendChild(opcaoPadrao);

            // Adiciona cada peca cadastrada como uma opcao no select
            pecas.forEach(function (peca) {
                var opcao = document.createElement('option');
                opcao.value = peca.nome;
                opcao.textContent = peca.nome + ' (cadastrada em ' + peca.data_cadastro + ')';
                selecaoPeca.appendChild(opcao);
            });
        })
        .catch(function (erro) {
            selecaoPeca.innerHTML = '<option value="">Erro ao carregar pecas</option>';
            console.error('Erro ao buscar pecas:', erro);
        });
    }


    // Quando o usuario seleciona uma foto, exibe o preview
    inputFoto.addEventListener('change', function () {
        var arquivo = this.files[0];

        if (!arquivo) return;

        arquivoSelecionado = arquivo;

        // Le o arquivo e exibe como preview
        var leitor = new FileReader();
        leitor.onload = function (evento) {
            imagemPreview.src = evento.target.result;
            previewContainer.style.display = 'flex';
        };
        leitor.readAsDataURL(arquivo);
    });


    // Ao clicar em remover, limpa a foto selecionada
    botaoRemoverFoto.addEventListener('click', function () {
        arquivoSelecionado = null;
        inputFoto.value = '';
        imagemPreview.src = '';
        previewContainer.style.display = 'none';
    });


    // Ao clicar em classificar, valida e envia para o backend
    botaoClassificar.addEventListener('click', function () {
        var nomePeca = selecaoPeca.value;

        if (!nomePeca) {
            alert('Selecione uma peca antes de continuar.');
            return;
        }

        if (!arquivoSelecionado) {
            alert('Selecione uma foto da peca para analise.');
            return;
        }

        // Converte a imagem para base64 e envia ao backend
        var leitor = new FileReader();
        leitor.onload = function (evento) {
            enviarClassificacao(nomePeca, evento.target.result);
        };
        leitor.readAsDataURL(arquivoSelecionado);
    });


    // Envia a foto e o nome da peca ao backend para classificacao
    function enviarClassificacao(nomePeca, imagemBase64) {
        // Esconde o formulario e exibe o spinner
        formulario.style.display = 'none';
        carregamento.style.display = 'flex';

        fetch('/api/classificar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nomePeca,
                imagem: imagemBase64
            })
        })
        .then(function (resposta) {
            return resposta.json();
        })
        .then(function (dados) {
            carregamento.style.display = 'none';

            if (dados.erro) {
                alert('Erro: ' + dados.erro);
                formulario.style.display = 'flex';
                return;
            }

            exibirResultado(dados.classificacao, dados.justificativa);
        })
        .catch(function (erro) {
            carregamento.style.display = 'none';
            formulario.style.display = 'flex';
            alert('Erro de conexao com o servidor. Verifique se o backend esta rodando.');
            console.error('Erro na requisicao:', erro);
        });
    }


    // Exibe o bloco de resultado com o badge colorido e a justificativa
    function exibirResultado(classificacao, justificativa) {
        // Define o texto do badge
        badgeResultado.textContent = classificacao;

        // Remove classes de cor anteriores e aplica a correta para este resultado
        badgeResultado.classList.remove('badge--aprovado', 'badge--reprovado', 'badge--revisar');

        if (classificacao === 'APROVADO') {
            badgeResultado.classList.add('badge--aprovado');
        } else if (classificacao === 'REPROVADO') {
            badgeResultado.classList.add('badge--reprovado');
        } else {
            badgeResultado.classList.add('badge--revisar');
        }

        // Exibe a justificativa gerada pela IA
        justificativaResultado.textContent = justificativa;

        // Mostra o bloco de resultado
        resultadoContainer.style.display = 'flex';
    }


    // Ao clicar em "Classificar outra peca", reseta a tela
    botaoNovaClassificacao.addEventListener('click', function () {
        // Limpa a foto selecionada
        arquivoSelecionado = null;
        inputFoto.value = '';
        imagemPreview.src = '';
        previewContainer.style.display = 'none';

        // Volta o select para a opcao padrao
        selecaoPeca.selectedIndex = 0;

        // Esconde o resultado e exibe o formulario novamente
        resultadoContainer.style.display = 'none';
        formulario.style.display = 'flex';

        // Recarrega a lista de pecas caso alguma tenha sido cadastrada enquanto isso
        carregarPecasCadastradas();
    });

});
