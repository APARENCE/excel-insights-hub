# Operação Spot Renault — Terminal TLOG

Painel operacional para acompanhamento de containers cheios e vazios locados
no terminal TLOG-SJP, com importação direta de planilhas Excel (.xlsx).

## Funcionalidades

- **Importar Dados**: faça upload da planilha mensal e o sistema parseia
  automaticamente as abas `CHEIOS TLOG ATENDIMENTO RENAULT` e `VAZIO LOCADO`.
- **Dashboard**: KPIs em tempo real (Em Pátio, Dê-Para, Enviado para Fábrica,
  Finalizados), capacidade do pátio e gráficos de movimentação.
- **Estoque**: lista filtrável de todos os containers cheios.
- **Controle de Demurrage**: ranking de containers por dias até o vencimento.
- **Vazios Locados**: visão dos containers vazios em locação no pátio.

Todos os dados ficam armazenados no `localStorage` do navegador — não há
backend nem envio de informações para servidores externos.

## Stack

- React 19 + TypeScript
- TanStack Router + TanStack Start (SSR)
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

A saída fica em `dist/` (cliente em `dist/client/`, servidor em `dist/server/`).

## Subindo para o GitHub

Pelo painel do Lovable:

1. Abra **Connectors → GitHub → Connect project**.
2. Autorize o app do Lovable na sua conta GitHub.
3. Clique em **Create Repository**. O projeto é enviado automaticamente
   e qualquer alteração feita no Lovable é sincronizada em tempo real.

## Deploy

Este projeto é uma aplicação **TanStack Start** que roda em runtime
serverless (Cloudflare Workers por padrão). Há duas formas recomendadas
de publicá-lo:

### Opção 1 — Publicar pelo Lovable (mais simples)

No editor do Lovable, clique em **Publish**. O projeto é hospedado
automaticamente em um subdomínio `*.lovable.app` e você pode conectar
um domínio próprio em **Project Settings → Domains**.

### Opção 2 — Deploy na Vercel

A Vercel suporta TanStack Start. Após conectar o repositório:

1. **Import Project** na Vercel apontando para o repositório do GitHub.
2. Em **Build & Output Settings**, deixe o framework como **Other** e
   configure:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Em **Settings → Functions**, garanta runtime Node 20+.
4. Clique em **Deploy**.

Se a Vercel não detectar automaticamente o handler SSR, instale o adapter
oficial:

```bash
npm install @tanstack/react-start
```

E adicione a variável de ambiente `TARGET=vercel` no painel da Vercel
antes do build.

> **Alternativa estática**: se você não precisa de SSR (este app é 100%
> client-side), também é possível convertê-lo em SPA pura. Avise se quiser
> esse caminho — exige reestruturar `__root.tsx`, criar `index.html` raiz
> e remover o preset TanStack Start.

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
