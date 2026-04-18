# Operação Spot Renault — Terminal TLOG

Painel operacional para acompanhamento de containers cheios e vazios locados
no terminal TLOG-SJP, com importação direta de planilhas Excel (.xlsx).

## Funcionalidades

- **Importar Dados**: faça upload da planilha mensal e o sistema parseia
  automaticamente as abas `CHEIOS TLOG ATENDIMENTO RENAULT` e `VAZIO LOCADO`.
- **Dashboard**: KPIs em tempo real (Em Pátio, Dê-Para, Enviado para Fábrica,
  Finalizados), capacidade do pátio e gráficos de movimentação.
- **Estoque**: lista filtrável de todos os containers cheios.
- **Controle de Demurrage**: ranking de containers por dias até o vencimento,
  com classificação de urgência (Vencido, Urgente, Alerta, Dentro do Prazo).
- **Vazios Locados**: visão dos containers vazios em locação no pátio.

Todos os dados ficam armazenados no `localStorage` do navegador — não há
backend nem envio de informações para servidores externos.

## Stack

- React 19 + TypeScript
- TanStack Router (roteamento file-based)
- Tailwind CSS v4 + shadcn/ui
- Recharts (gráficos)
- SheetJS / xlsx (parser de Excel)
- Vite 7

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra http://localhost:8080.

## Build de produção

```bash
npm run build
```

Os arquivos estáticos são gerados em `dist/client/`.

## Deploy na Vercel

O projeto já está pré-configurado para a Vercel via `vercel.json`:

1. Faça push do repositório para o GitHub.
2. No painel da Vercel, clique em **Add New → Project** e importe o repo.
3. A Vercel detecta automaticamente as configurações:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/client`
4. Clique em **Deploy**. Pronto.

Não há variáveis de ambiente obrigatórias.

## Estrutura

```
src/
├── components/        # AppShell, StatCard, StatusBadge, ui/* (shadcn)
├── lib/
│   ├── analytics.ts   # Cálculos de KPIs, demurrage, distribuição
│   ├── excel-parser.ts# Parser .xlsx (lê coluna AA = STATUS)
│   ├── store.ts       # Estado global (localStorage)
│   └── types.ts       # Tipos do domínio
└── routes/            # /, /estoque, /demurrage, /vazios, /importar
```
