# Gerador de Procurações Jurídicas

Aplicativo web para geração automática de procurações jurídicas brasileiras com inteligência artificial.

## Funcionalidades

- **Geração com IA** — Procurações completas geradas automaticamente pelo Claude
- **Template próprio** — Upload de .docx com variáveis `{{NOME}}` substituídas automaticamente
- **Download .docx** — Baixe o documento preenchido mantendo a formatação original
- **4 tipos** — Ad Judicia, Ad Negotia, Ad Judicia et Extra, Pública

## Como rodar localmente

```bash
npm install
npm run dev
```

## Deploy no Netlify

### Opção 1: Via GitHub (recomendado)

1. Suba este projeto para o GitHub
2. No Netlify, clique em "Add new site" → "Import an existing project"
3. Conecte o repositório
4. Build command: `npm run build`
5. Publish directory: `dist`

### Opção 2: Deploy manual (arrastar e soltar)

```bash
npm install
npm run build
```

Arraste a pasta `dist/` para o Netlify em app.netlify.com/drop

## Variáveis suportadas no template .docx

| Variável | Descrição |
|----------|-----------|
| `{{NOME_OUTORGANTE}}` | Nome completo do outorgante |
| `{{NACIONALIDADE_OUTORGANTE}}` | Nacionalidade |
| `{{ESTADO_CIVIL}}` | Estado civil |
| `{{PROFISSAO_OUTORGANTE}}` | Profissão |
| `{{CPF_OUTORGANTE}}` | CPF |
| `{{RG_OUTORGANTE}}` | RG |
| `{{ORGAO_EXPEDIDOR}}` | Órgão expedidor |
| `{{ENDERECO_OUTORGANTE}}` | Endereço completo |
| `{{NOME_OUTORGADO}}` | Nome do outorgado |
| `{{NACIONALIDADE_OUTORGADO}}` | Nacionalidade do outorgado |
| `{{PROFISSAO_OUTORGADO}}` | Profissão do outorgado |
| `{{CPF_OUTORGADO}}` | CPF do outorgado |
| `{{OAB_OUTORGADO}}` | Número da OAB |
| `{{ENDERECO_OUTORGADO}}` | Endereço do outorgado |
| `{{PODERES}}` | Poderes concedidos |
| `{{FORO}}` | Foro eleito |
| `{{DATA}}` | Data por extenso |

## Aviso

Documento gerado por IA — revisão profissional recomendada antes do uso.
