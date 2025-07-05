document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURAÇÕES E SELETORES GLOBAIS ---
  const URL_API = "http://127.0.0.1:5000";
  const formularioProduto = document.getElementById("formulario-produto");
  const listaProdutos = document.getElementById("lista-produtos");
  const estadoVazio = document.getElementById("estado-vazio");
  const botaoMenu = document.getElementById("botao-menu");
  const barraLateral = document.getElementById("barra-lateral");
  const sobreposicaoBarraLateral = document.getElementById(
    "sobreposicao-barra-lateral"
  );
  const inputPreco = document.getElementById("preco-produto");
  const modalVenda = document.getElementById("modal-venda");
  const modalAdicionarQuantidade = document.getElementById(
    "modal-adicionar-quantidade"
  );
  const modalConfirmarExclusao = document.getElementById(
    "modal-confirmar-exclusao"
  );
  let idProdutoAtivo = null;
  let cacheProdutosLocal = [];

  // --- FUNÇÕES DE API (ASYNC/AWAIT) ---
  const chamarAPI = async (endpoint, opcoes = {}) => {
    try {
      const resposta = await fetch(`${URL_API}${endpoint}`, opcoes);
      if (!resposta.ok) {
        const dadosErro = await resposta.json();
        throw new Error(dadosErro.error || "Ocorreu um erro na API");
      }
      return resposta.status === 204 ? null : await resposta.json();
    } catch (erro) {
      alert(`Erro de comunicação com a API: ${erro.message}`);
      return null;
    }
  };

  const obterProdutos = () => chamarAPI("/buscar_produtos");
  const adicionarProduto = (produto) =>
    chamarAPI("/adicionar_produto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(produto),
    });
  const excluirProduto = (produto_id) =>
    chamarAPI(`/deletar_produto/${produto_id}`, { method: "DELETE" });
  const venderProduto = (produto_id, quantidade) =>
    chamarAPI(`/vender_produto/${produto_id}/vender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade: quantidade }),
    });
  const adicionarEstoque = (produto_id, quantidade) =>
    chamarAPI(`/adicionar_estoque_produto/${produto_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade: quantidade }),
    });

  // --- RENDERIZAÇÃO E FORMATAÇÃO ---
  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
      .format(isNaN(valor) ? 0 : valor)
      .replace("R$", "")
      .trim();
  const analisarMoeda = (valor) =>
    parseFloat(valor.replace(/\./g, "").replace(",", "."));

  const renderizarProdutos = async () => {
    const produtos = await obterProdutos();
    cacheProdutosLocal = produtos || [];
    listaProdutos.innerHTML = "";

    if (!produtos || produtos.length === 0) {
      estadoVazio.style.display = "block";
      return;
    }
    estadoVazio.style.display = "none";

    produtos.forEach((produto) => {
      const tr = document.createElement("tr");
      const botaoAcaoVender = `<button class="botao-acao vender" data-id="${produto.id}" title="Vender"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></button>`;
      const botaoAcaoAddEstoque = `<button class="botao-acao adicionar-quantidade" data-id="${produto.id}" title="Adicionar Estoque"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg></button>`;

      tr.innerHTML = `
                    <td><div class="nome-produto">${produto.nome}</div></td>
                    <td><div class="sku-produto">${produto.sku}</div></td>
                    <td>${produto.quantidade}</td>
                    <td>R$ ${formatarMoeda(produto.preco)}</td>
                    <td class="botoes-acao">
                        ${botaoAcaoVender}
                        ${botaoAcaoAddEstoque}
                        <button class="botao-acao excluir" data-id="${
                          produto.id
                        }" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </td>`;
      listaProdutos.appendChild(tr);
    });
  };

  // --- MODAIS ---
  const abrirModal = (elementoModal, id) => {
    const produto = cacheProdutosLocal.find((p) => p.id === id);
    if (!produto) {
      console.error("Produto não encontrado no cache local.");
      return;
    }
    idProdutoAtivo = id;

    if (elementoModal === modalVenda) {
      elementoModal.querySelector("#modal-nome-produto").textContent =
        produto.nome;
      elementoModal.querySelector("#modal-estoque-produto").textContent =
        produto.quantidade;
      const input = elementoModal.querySelector("#quantidade-venda");
      input.value = "1";
      input.max = produto.quantidade;
    } else if (elementoModal === modalAdicionarQuantidade) {
      elementoModal.querySelector(
        "#nome-produto-adicionar-quantidade"
      ).textContent = produto.nome;
      elementoModal.querySelector("#input-adicionar-quantidade").value = "";
    } else if (elementoModal === modalConfirmarExclusao) {
      elementoModal.querySelector(
        "#nome-produto-excluir"
      ).textContent = `"${produto.nome}"`;
    }
    elementoModal.classList.add("aberta");
  };

  const fecharTodosOsModais = () =>
    document
      .querySelectorAll(".modal")
      .forEach((m) => m.classList.remove("aberta"));

  // --- MANIPULADORES DE EVENTOS ---
  const manipularEnvioFormulario = async (e) => {
    e.preventDefault();
    const novoProduto = {
      nome: document.getElementById("nome-produto").value.trim(),
      sku: document.getElementById("sku-produto").value.trim(),
      quantidade: parseInt(document.getElementById("quantidade-produto").value),
      preco: analisarMoeda(document.getElementById("preco-produto").value),
    };
    if (
      !novoProduto.nome ||
      !novoProduto.sku ||
      isNaN(novoProduto.quantidade) ||
      isNaN(novoProduto.preco)
    ) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }
    await adicionarProduto(novoProduto);
    await renderizarProdutos();
    formularioProduto.reset();
  };

  const manipularConfirmacaoVenda = async () => {
    const quantidade = parseInt(
      document.getElementById("quantidade-venda").value
    );
    await venderProduto(idProdutoAtivo, quantidade);
    await renderizarProdutos();
    fecharTodosOsModais();
  };

  const manipularConfirmacaoAdicao = async () => {
    const quantidade = parseInt(
      document.getElementById("input-adicionar-quantidade").value
    );
    await adicionarEstoque(idProdutoAtivo, quantidade);
    await renderizarProdutos();
    fecharTodosOsModais();
  };

  const manipularConfirmacaoExclusao = async () => {
    await excluirProduto(idProdutoAtivo);
    await renderizarProdutos();
    fecharTodosOsModais();
  };

  const manipularCliqueLista = (e) => {
    const botao = e.target.closest("button.botao-acao");
    if (!botao) return;
    const id = parseInt(botao.dataset.id);
    if (botao.classList.contains("vender")) abrirModal(modalVenda, id);
    else if (botao.classList.contains("adicionar-quantidade"))
      abrirModal(modalAdicionarQuantidade, id);
    else if (botao.classList.contains("excluir"))
      abrirModal(modalConfirmarExclusao, id);
  };

  const alternarBarraLateral = () => {
    const estaAberta = barraLateral.classList.toggle("aberta");
    sobreposicaoBarraLateral.classList.toggle("aberta");
    botaoMenu.innerHTML = estaAberta
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
  };

  inputPreco.addEventListener("input", (e) => {
    let valor = e.target.value.replace(/\D/g, "");
    if (valor) {
      valor = (parseInt(valor, 10) / 100)
        .toFixed(2)
        .toString()
        .replace(".", ",");
      if (valor.length > 6)
        valor = valor.replace(/(\d)(?=(\d{3})+(?!\d{2}))/g, "$1.");
      e.target.value = valor;
    } else {
      e.target.value = "";
    }
  });

  // --- INICIALIZAÇÃO E REGISTRO DE EVENTOS ---
  formularioProduto.addEventListener("submit", manipularEnvioFormulario);
  listaProdutos.addEventListener("click", manipularCliqueLista);
  botaoMenu.addEventListener("click", alternarBarraLateral);
  document
    .querySelectorAll(".modal-sobreposicao, .botao-cancelar")
    .forEach((el) => el.addEventListener("click", fecharTodosOsModais));
  document
    .getElementById("botao-confirmar-venda")
    .addEventListener("click", manipularConfirmacaoVenda);
  document
    .getElementById("botao-confirmar-adicao-quantidade")
    .addEventListener("click", manipularConfirmacaoAdicao);
  document
    .getElementById("botao-confirmar-exclusao")
    .addEventListener("click", manipularConfirmacaoExclusao);

  renderizarProdutos(); // Renderização inicial
});
