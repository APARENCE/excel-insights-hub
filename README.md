# Operação Spot Renault — Terminal TLOG

Painel operacional para acompanhamento de containers cheios e vazios locados
no terminal TLOG-SJP, com importação direta de planilhas Excel (.xlsx).

## Funcionalidades

- **Importar Dados**: faça upload da planilha mensal e o sistema parseia
  automaticamente as abas `CHEIOS TLOG ATENDIMENTO RENAULT` e `VAZIO LOCADO`.
- **Dashboard**: KPIs em tempo real, capacidade do pátio e gráficos.
- **Estoque**: lista filtrável de todos os containers cheios.
- **Controle de Demurrage**: ranking por dias até o vencimento.
- **Vazios Locados**: visão dos containers vazios em locação no pátio.

Todos os dados ficam armazenados no `localStorage` do navegador — não há
backend nem envio de informações para servidores externos.

## Stack

- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 + shadcn/ui
- Recharts (gráficos)
- SheetJS / xlsx (parser de Excel)
- TanStack Router (preview Lovable) / React Router DOM (build Vercel)

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Subindo para o GitHub

No editor do Lovable: **Connectors → GitHub → Connect project →
Create Repository**. Sincronização bidirecional automática.

## Deploy na Vercel ✅

O projeto está **pré-configurado** para Vercel. O `vercel.json` já contém
o build command e o SPA fallback necessários.

### Passos

1. Suba o código para o GitHub (ver acima).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. **Não altere nenhuma configuração** — a Vercel detecta o `vercel.json`
   automaticamente:
   - Build Command: `npx vite build --config vite.config.vercel.ts`
   - Output Directory: `dist`
   - Rewrites: todas as rotas → `/index.html` (SPA fallback)
4. Clique em **Deploy**.

Não há variáveis de ambiente necessárias.

## Arquitetura dual de build

Para permitir edição no Lovable **e** deploy na Vercel sem refatoração:

- **Editor Lovable**: usa TanStack Start (rotas em `src/routes/`).
- **Build Vercel**: usa SPA puro com `index.html` na raiz, entrada
  `src/main.tsx` e React Router DOM. Configurado em `vite.config.vercel.ts`.
- Ambos renderizam os **mesmos componentes** localizados em `src/pages/`.

## Estrutura

```
src/
├── components/        # AppShell, NavLink, StatCard, StatusBadge, ui/*
├── lib/
│   ├── analytics.ts   # KPIs, demurrage, distribuição
│   ├── excel-parser.ts# Parser .xlsx (lê coluna AA = STATUS)
│   ├── store.ts       # Estado global (localStorage)
│   └── types.ts
├── pages/             # Dashboard, Estoque, Demurrage, Vazios, Importar
├── routes/            # Rotas TanStack (re-exportam src/pages/)
└── main.tsx           # Entrada SPA da Vercel
```
