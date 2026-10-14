# Sistema de Pedidos

Painel web para pequenos negócios organizarem pedidos, estoque e entregas num lugar só, sem planilha paralela.

Projeto de demonstração. Os clientes e produtos que aparecem são dados fictícios de exemplo.

## Funcionalidades

- **Painel:** pedidos em aberto, entregas do dia, faturamento do mês e alerta de estoque baixo.
- **Pedidos:** criação com vários itens, total calculado na hora e fluxo de status (Novo → Em separação → Entregue).
- **Estoque automático:** criar um pedido dá baixa no estoque. Cancelar devolve os itens. O sistema bloqueia pedidos sem estoque suficiente.
- **Produtos e clientes:** cadastro e edição.
- **Exportação:** CSV dos pedidos, pronto para abrir no Excel.
- Os dados ficam salvos no navegador (`localStorage`).

## Tecnologias

HTML, CSS e JavaScript puro, sem dependências e sem etapa de build.

## Rodar localmente

Abra o `index.html` no navegador. Se preferir usar um servidor:

```bash
python -m http.server 8000
```

## Próximos passos

- Back-end em Node.js com PostgreSQL, com login e permissões por função
- Envio do status do pedido para o cliente pelo WhatsApp
- Relatórios por período e por cliente

---

Desenvolvido por **Mário Luiz**.
