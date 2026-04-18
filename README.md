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

Este projeto usa **TanStack Start**, um framework SSR cuja saída de build
é um Worker (Cloudflare). **A Vercel não suporta esse formato nativamente**
e por isso retorna `404: NOT_FOUND` quando o repositório é importado sem
ajustes.

### ✅ Opção recomendada — Publicar pelo Lovable

No editor do Lovable, clique em **Publish** (canto superior direito).
O projeto vai ao ar em segundos em um subdomínio `*.lovable.app`, com
SSR funcionando, SPA fallback automático e suporte a domínio próprio em
**Project Settings → Domains**. Zero configuração.

### ⚠️ Opção avançada — Cloudflare Pages

Se você precisa hospedar fora do Lovable, o destino natural é a
**Cloudflare** (mesmo runtime do build). Em **Cloudflare Pages**:

1. Conecte o repositório do GitHub.
2. Build command: `npm run build`
3. Build output directory: `dist/client`
4. Em **Functions → Compatibility flags** adicione `nodejs_compat`.
5. Faça upload do worker em `dist/server/index.js` como Pages Function
   (ou use `wrangler deploy`).

### ❌ Vercel (não suportado neste template)

A Vercel exige um adapter SSR específico que o template TanStack Start
do Lovable não inclui. Tentar importar o repositório direto resulta em
404. Se você precisa muito de Vercel, é necessário refatorar o projeto
para SPA pura (remover SSR, criar `index.html` raiz). Como o app é 100%
client-side (tudo em `localStorage`), nada seria perdido funcionalmente —
peça essa conversão se for realmente necessário.

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
