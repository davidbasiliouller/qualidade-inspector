// Aguarda o HTML carregar completamente antes de executar o script
document.addEventListener('DOMContentLoaded', function () {

    // Referencia aos elementos da pagina
    var inputNome = document.getElementById('nome-peca');
    var inputFotos = document.getElementById('input-fotos');
    var galeriaPreview = document.getElementById('galeria-preview');
    var contadorFotos = document.getElementById('contador-fotos');
    var botaoCadastrar = document.getElementById('botao-cadastrar');
    var resultadoCadastro = document.getElementById('resultado-cadastro');
    var criterioTexto = document.getElementById('criterio-texto');
    var carregamento = document.getElementById('carregamento');
    var botaoNovoCadastro = document.getElementById('botao-novo-cadastro');
    var card = document.querySelector('.card');

    // Array que guarda os arquivos de imagem selecionados pelo usuario
    var arquivosSelecionados = [];


    // Quando o usuario seleciona arquivos no input, atualiza o array e o preview
    inputFotos.addEventListener('change', function () {
        var novosArquivos = Array.from(this.files);

        // Limita o total de fotos a 10
        var totalComNovos = arquivosSelecionados.length + novosArquivos.length;
        if (totalComNovos > 10) {
            alert('Maximo de 10 fotos permitido. Selecione menos fotos.');
            return;
        }

        // Adiciona os novos arquivos ao array existente
        arquivosSelecionados = arquivosSelecionados.concat(novosArquivos);

        atualizarGaleriaPreview();
    });


    // Renderiza as miniaturas das fotos selecionadas na galeria
    function atualizarGaleriaPreview() {
        // Limpa a galeria antes de renderizar novamente
        galeriaPreview.innerHTML = '';

        arquivosSelecionados.forEach(function (arquivo) {
            var leitor = new FileReader();

            leitor.onload = function (evento) {
                var img = document.createElement('img');
                img.src = evento.target.result;
                img.className = 'galeria-preview__item';
                img.title = arquivo.name;
                galeriaPreview.appendChild(img);
            };

            leitor.readAsDataURL(arquivo);
        });

        // Atualiza o contador de fotos
        contadorFotos.textContent = arquivosSelecionados.length + ' foto(s) selecionada(s)';
    }


    // Ao clicar em cadastrar, valida e envia os dados para o backend
    botaoCadastrar.addEventListener('click', function () {
        var nome = inputNome.value.trim();

        // Valida o nome da peca
        if (!nome) {
            alert('Informe o nome da peca antes de continuar.');
            inputNome.focus();
            return;
        }

        // Valida a quantidade minima de fotos
        if (arquivosSelecionados.length < 3) {
            alert('Envie pelo menos 3 fotos de pecas aprovadas.');
            return;
        }

        // Converte todas as imagens para base64 e envia ao backend
        converterImagensParaBase64(arquivosSelecionados, function (imagensBase64) {
            enviarCadastro(nome, imagensBase64);
        });
    });


    // Converte um array de arquivos File para um array de strings base64
    // Chama o callback quando todas as conversoes terminarem
    function converterImagensParaBase64(arquivos, callback) {
        var resultados = [];
        var concluidos = 0;

        arquivos.forEach(function (arquivo, indice) {
            var leitor = new FileReader();

            leitor.onload = function (evento) {
                resultados[indice] = evento.target.result;
                concluidos++;

                // Quando todos os arquivos forem convertidos, chama o callback
                if (concluidos === arquivos.length) {
                    callback(resultados);
                }
            };

            leitor.readAsDataURL(arquivo);
        });
    }


    // Envia os dados do cadastro para o backend e trata a resposta
    function enviarCadastro(nome, imagensBase64) {
        // Esconde o formulario e exibe o spinner de carregamento
        card.style.display = 'none';
        carregamento.style.display = 'flex';

        fetch('/api/cadastrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome,
                imagens: imagensBase64
            })
        })
        .then(function (resposta) {
            return resposta.json();
        })
        .then(function (dados) {
            // Esconde o spinner
            carregamento.style.display = 'none';

            if (dados.erro) {
                alert('Erro: ' + dados.erro);
                card.style.display = 'flex';
                return;
            }

            // Exibe o bloco de resultado com o criterio gerado pela IA
            criterioTexto.textContent = dados.criterio;
            resultadoCadastro.style.display = 'flex';
        })
        .catch(function (erro) {
            carregamento.style.display = 'none';
            card.style.display = 'flex';
            alert('Erro de conexao com o servidor. Verifique se o backend esta rodando.');
            console.error('Erro na requisicao:', erro);
        });
    }


    // Ao clicar em "Cadastrar outra peca", reseta o formulario
    botaoNovoCadastro.addEventListener('click', function () {
        // Limpa todos os campos
        inputNome.value = '';
        arquivosSelecionados = [];
        galeriaPreview.innerHTML = '';
        contadorFotos.textContent = '0 foto(s) selecionada(s)';

        // Esconde o resultado e exibe o formulario novamente
        resultadoCadastro.style.display = 'none';
        card.style.display = 'flex';
    });

});
