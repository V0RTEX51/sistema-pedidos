"use strict";

/* ---------- Dados ---------- */

const STORAGE_KEY = "pedidos-app-v1";
const STATUS = {
  novo: "Novo",
  separacao: "Em separação",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const NEXT_STATUS = { novo: "separacao", separacao: "entregue" };

const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

function seed() {
  return {
    nextId: { produto: 7, cliente: 5, pedido: 106 },
    produtos: [
      { id: 1, nome: "Água mineral 500ml (fardo c/ 12)", preco: 18.9, estoque: 40, minimo: 15 },
      { id: 2, nome: "Café torrado 500g", preco: 24.5, estoque: 8, minimo: 10 },
      { id: 3, nome: "Açúcar cristal 5kg", preco: 22.0, estoque: 25, minimo: 8 },
      { id: 4, nome: "Copo descartável 180ml (c/ 100)", preco: 7.8, estoque: 60, minimo: 20 },
      { id: 5, nome: "Guardanapo (pct c/ 50)", preco: 4.2, estoque: 5, minimo: 15 },
      { id: 6, nome: "Detergente 500ml", preco: 3.6, estoque: 34, minimo: 12 },
    ],
    clientes: [
      { id: 1, nome: "Padaria Pão Dourado", telefone: "(12) 99111-0001", endereco: "Rua das Flores, 120" },
      { id: 2, nome: "Escritório Contábil Silva", telefone: "(12) 99111-0002", endereco: "Av. Central, 45, sala 3" },
      { id: 3, nome: "Lanchonete do Zé", telefone: "(12) 99111-0003", endereco: "Praça da Matriz, 9" },
      { id: 4, nome: "Academia Movimento", telefone: "(12) 99111-0004", endereco: "Rua Sete, 300" },
    ],
    pedidos: [
      { id: 101, clienteId: 1, entrega: isoDay(0), status: "separacao", itens: [{ produtoId: 1, qtd: 3 }, { produtoId: 4, qtd: 2 }] },
      { id: 102, clienteId: 2, entrega: isoDay(0), status: "novo", itens: [{ produtoId: 2, qtd: 2 }, { produtoId: 3, qtd: 1 }] },
      { id: 103, clienteId: 3, entrega: isoDay(1), status: "novo", itens: [{ produtoId: 5, qtd: 4 }, { produtoId: 6, qtd: 6 }] },
      { id: 104, clienteId: 4, entrega: isoDay(-1), status: "entregue", itens: [{ produtoId: 1, qtd: 5 }] },
      { id: 105, clienteId: 1, entrega: isoDay(-2), status: "entregue", itens: [{ produtoId: 2, qtd: 1 }, { produtoId: 6, qtd: 2 }] },
    ],
  };
}

let db = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* armazenamento indisponível: usa dados de exemplo */ }
  return seed();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (_) {}
}

/* ---------- Helpers ---------- */

const $ = (sel) => document.querySelector(sel);
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso) => new Date(iso + "T12:00").toLocaleDateString("pt-BR");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const produto = (id) => db.produtos.find((p) => p.id === id);
const cliente = (id) => db.clientes.find((c) => c.id === id);
const totalPedido = (p) => p.itens.reduce((s, i) => s + (produto(i.produtoId)?.preco || 0) * i.qtd, 0);

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Navegação ---------- */

document.querySelectorAll(".nav-item").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + btn.dataset.view));
    render();
  })
);

/* ---------- Renderização ---------- */

function render() {
  renderPainel();
  renderPedidos();
  renderProdutos();
  renderClientes();
}

function renderPainel() {
  $("#today").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const ativos = db.pedidos.filter((p) => p.status !== "cancelado");
  const mes = isoDay().slice(0, 7);
  const faturamento = ativos.filter((p) => p.entrega.startsWith(mes)).reduce((s, p) => s + totalPedido(p), 0);
  const abertos = ativos.filter((p) => p.status === "novo" || p.status === "separacao").length;
  const baixo = db.produtos.filter((p) => p.estoque <= p.minimo);

  $("#kpis").innerHTML = [
    ["Pedidos em aberto", abertos],
    ["Entregas hoje", ativos.filter((p) => p.entrega === isoDay() && p.status !== "entregue").length],
    ["Faturamento do mês", brl(faturamento)],
    ["Itens com estoque baixo", baixo.length, baixo.length ? "accent" : ""],
  ].map(([label, value, cls = ""]) => `<div class="card kpi"><div class="label">${label}</div><div class="value ${cls}">${value}</div></div>`).join("");

  const hoje = ativos.filter((p) => p.entrega === isoDay() && p.status !== "entregue");
  $("#deliveries").innerHTML = hoje.length
    ? hoje.map((p) => `<li><div>#${p.id} · ${esc(cliente(p.clienteId)?.nome ?? "—")}<div class="sub">${esc(cliente(p.clienteId)?.endereco ?? "")}</div></div><span class="badge ${p.status}">${STATUS[p.status]}</span></li>`).join("")
    : `<li class="empty">Nenhuma entrega pendente para hoje.</li>`;

  $("#lowstock").innerHTML = baixo.length
    ? baixo.map((p) => `<li><span>${esc(p.nome)}</span><span class="low">${p.estoque} / mín. ${p.minimo}</span></li>`).join("")
    : `<li class="empty">Estoque em dia.</li>`;
}

function renderPedidos() {
  const filtro = $("#statusFilter").value;
  const lista = db.pedidos
    .filter((p) => !filtro || p.status === filtro)
    .sort((a, b) => b.id - a.id);

  $("#ordersBody").innerHTML = lista.length
    ? lista.map((p) => {
        const itens = p.itens.map((i) => `${i.qtd}× ${produto(i.produtoId)?.nome ?? "?"}`).join(", ");
        const next = NEXT_STATUS[p.status];
        return `<tr>
          <td>#${p.id}</td>
          <td>${esc(cliente(p.clienteId)?.nome ?? "—")}</td>
          <td title="${esc(itens)}">${p.itens.reduce((s, i) => s + i.qtd, 0)} itens</td>
          <td>${fmtDate(p.entrega)}</td>
          <td>${brl(totalPedido(p))}</td>
          <td><span class="badge ${p.status}">${STATUS[p.status]}</span></td>
          <td class="right">
            ${next ? `<button class="link" data-advance="${p.id}">→ ${STATUS[next]}</button>` : ""}
            ${p.status !== "cancelado" && p.status !== "entregue" ? `<button class="link" data-cancel="${p.id}">Cancelar</button>` : ""}
          </td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="7" class="empty">Nenhum pedido encontrado.</td></tr>`;
}

function renderProdutos() {
  $("#productsBody").innerHTML = db.produtos.map((p) => `<tr>
    <td>${esc(p.nome)}</td>
    <td>${brl(p.preco)}</td>
    <td class="${p.estoque <= p.minimo ? "low" : ""}">${p.estoque}</td>
    <td>${p.minimo}</td>
    <td class="right"><button class="link" data-edit-product="${p.id}">Editar</button></td>
  </tr>`).join("");
}

function renderClientes() {
  $("#clientsBody").innerHTML = db.clientes.map((c) => `<tr>
    <td>${esc(c.nome)}</td>
    <td>${esc(c.telefone)}</td>
    <td>${esc(c.endereco)}</td>
    <td>${db.pedidos.filter((p) => p.clienteId === c.id).length}</td>
    <td class="right"><button class="link" data-edit-client="${c.id}">Editar</button></td>
  </tr>`).join("");
}

/* ---------- Regras de pedido ---------- */

function avancarStatus(id) {
  const p = db.pedidos.find((x) => x.id === id);
  const next = NEXT_STATUS[p.status];
  if (!next) return;
  p.status = next;
  save(); render();
  toast(`Pedido #${id}: ${STATUS[next]}`);
}

function cancelarPedido(id) {
  const p = db.pedidos.find((x) => x.id === id);
  if (!confirm(`Cancelar o pedido #${id}? Os itens voltam para o estoque.`)) return;
  p.itens.forEach((i) => { const prod = produto(i.produtoId); if (prod) prod.estoque += i.qtd; });
  p.status = "cancelado";
  save(); render();
  toast(`Pedido #${id} cancelado`);
}

$("#ordersBody").addEventListener("click", (e) => {
  const adv = e.target.dataset.advance, can = e.target.dataset.cancel;
  if (adv) avancarStatus(Number(adv));
  if (can) cancelarPedido(Number(can));
});
$("#statusFilter").addEventListener("change", renderPedidos);

/* ---------- Formulários ---------- */

const dlg = $("#dlg");
const form = $("#dlgForm");

function openDialog(html, onSubmit) {
  form.innerHTML = html;
  form.onsubmit = (e) => {
    if (e.submitter?.value === "cancel") return;
    e.preventDefault();
    const err = onSubmit(new FormData(form));
    if (err) { form.querySelector(".error").textContent = err; return; }
    dlg.close(); save(); render();
  };
  dlg.showModal();
}

const dlgButtons = (label) => `<p class="error"></p>
  <div class="dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancelar</button><button class="btn" value="ok">${label}</button></div>`;

function itemRow() {
  const opts = db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)} — ${brl(p.preco)} (${p.estoque} em estoque)</option>`).join("");
  return `<div class="item-row"><select name="produto">${opts}</select><input name="qtd" type="number" min="1" value="1" aria-label="Quantidade"><button type="button" class="link" data-remove-item aria-label="Remover item">✕</button></div>`;
}

function novoPedido() {
  if (!db.clientes.length || !db.produtos.length) { toast("Cadastre clientes e produtos primeiro"); return; }
  const clientes = db.clientes.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
  openDialog(`
    <h3>Novo pedido</h3>
    <div class="row">
      <label>Cliente<select name="cliente">${clientes}</select></label>
      <label>Entrega<input name="entrega" type="date" value="${isoDay()}" required></label>
    </div>
    <label>Itens</label>
    <div class="items" id="items">${itemRow()}</div>
    <button type="button" class="btn ghost" id="addItem">+ Adicionar item</button>
    <div class="total" id="orderTotal"></div>
    ${dlgButtons("Criar pedido")}`,
  (fd) => {
    const prods = fd.getAll("produto").map(Number);
    const qtds = fd.getAll("qtd").map(Number);
    const itens = [];
    prods.forEach((pid, i) => {
      if (!(qtds[i] > 0)) return;
      const existente = itens.find((x) => x.produtoId === pid);
      existente ? (existente.qtd += qtds[i]) : itens.push({ produtoId: pid, qtd: qtds[i] });
    });
    if (!itens.length) return "Adicione pelo menos um item.";
    const falta = itens.find((i) => produto(i.produtoId).estoque < i.qtd);
    if (falta) return `Estoque insuficiente de "${produto(falta.produtoId).nome}" (disponível: ${produto(falta.produtoId).estoque}).`;

    itens.forEach((i) => (produto(i.produtoId).estoque -= i.qtd));
    const id = db.nextId.pedido++;
    db.pedidos.push({ id, clienteId: Number(fd.get("cliente")), entrega: fd.get("entrega"), status: "novo", itens });
    toast(`Pedido #${id} criado`);
  });

  const updateTotal = () => {
    const fd = new FormData(form);
    const qtds = fd.getAll("qtd").map(Number);
    const total = fd.getAll("produto").reduce((s, pid, i) => s + (produto(Number(pid))?.preco || 0) * (qtds[i] || 0), 0);
    $("#orderTotal").textContent = "Total: " + brl(total);
  };
  $("#addItem").onclick = () => { $("#items").insertAdjacentHTML("beforeend", itemRow()); updateTotal(); };
  $("#items").onclick = (e) => {
    if (e.target.dataset.removeItem !== undefined && $("#items").children.length > 1) {
      e.target.closest(".item-row").remove(); updateTotal();
    }
  };
  form.oninput = updateTotal;
  updateTotal();
}

function editarProduto(id) {
  const p = id ? produto(id) : { nome: "", preco: "", estoque: 0, minimo: 5 };
  openDialog(`
    <h3>${id ? "Editar produto" : "Novo produto"}</h3>
    <label>Nome<input name="nome" required value="${esc(p.nome)}"></label>
    <div class="row">
      <label>Preço (R$)<input name="preco" type="number" step="0.01" min="0" required value="${p.preco}"></label>
      <label>Estoque<input name="estoque" type="number" min="0" required value="${p.estoque}"></label>
    </div>
    <label>Estoque mínimo<input name="minimo" type="number" min="0" required value="${p.minimo}"></label>
    ${dlgButtons("Salvar")}`,
  (fd) => {
    const data = { nome: fd.get("nome").trim(), preco: Number(fd.get("preco")), estoque: Number(fd.get("estoque")), minimo: Number(fd.get("minimo")) };
    if (!data.nome) return "Informe o nome.";
    if (id) Object.assign(p, data);
    else db.produtos.push({ id: db.nextId.produto++, ...data });
    toast("Produto salvo");
  });
}

function editarCliente(id) {
  const c = id ? cliente(id) : { nome: "", telefone: "", endereco: "" };
  openDialog(`
    <h3>${id ? "Editar cliente" : "Novo cliente"}</h3>
    <label>Nome<input name="nome" required value="${esc(c.nome)}"></label>
    <label>Telefone<input name="telefone" type="tel" value="${esc(c.telefone)}"></label>
    <label>Endereço<input name="endereco" value="${esc(c.endereco)}"></label>
    ${dlgButtons("Salvar")}`,
  (fd) => {
    const data = { nome: fd.get("nome").trim(), telefone: fd.get("telefone").trim(), endereco: fd.get("endereco").trim() };
    if (!data.nome) return "Informe o nome.";
    if (id) Object.assign(c, data);
    else db.clientes.push({ id: db.nextId.cliente++, ...data });
    toast("Cliente salvo");
  });
}

$("#newOrderBtn").onclick = novoPedido;
$("#newProductBtn").onclick = () => editarProduto();
$("#newClientBtn").onclick = () => editarCliente();
$("#productsBody").onclick = (e) => e.target.dataset.editProduct && editarProduto(Number(e.target.dataset.editProduct));
$("#clientsBody").onclick = (e) => e.target.dataset.editClient && editarCliente(Number(e.target.dataset.editClient));

/* ---------- Exportação ---------- */

$("#exportBtn").onclick = () => {
  const linhas = [["pedido", "cliente", "entrega", "status", "itens", "total"]];
  db.pedidos.forEach((p) => linhas.push([
    p.id,
    cliente(p.clienteId)?.nome ?? "",
    p.entrega,
    STATUS[p.status],
    p.itens.map((i) => `${i.qtd}x ${produto(i.produtoId)?.nome ?? ""}`).join(" | "),
    totalPedido(p).toFixed(2),
  ]));
  const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `pedidos-${isoDay()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

$("#resetBtn").onclick = () => {
  if (!confirm("Apagar tudo e restaurar os dados de exemplo?")) return;
  db = seed(); save(); render();
  toast("Dados de exemplo restaurados");
};

render();
