# Deploy automático com Dokploy

Este projeto está configurado para **deploy automático no Dokploy** quando o CI passa e você faz push na branch `main` (ou `master`).

---

## Opção 1: GitHub Actions (recomendado)

O workflow `.github/workflows/ci.yml` inclui o job `deploy-dokploy`, que dispara um deploy no Dokploy **apenas** quando:

- O push é na branch `main` ou `master` (não em PR)
- Os jobs `lint-and-test` e `e2e` passaram

### Configurar no GitHub

1. No repositório: **Settings** → **Secrets and variables** → **Actions**.
2. Crie estes **secrets**:

| Secret | Onde pegar |
|--------|------------|
| `DOKPLOY_URL` | URL base do seu Dokploy, sem barra no final. Ex.: `https://dokploy.seudominio.com` |
| `DOKPLOY_APPLICATION_ID` | Na URL do seu app no Dokploy. Ex.: em `.../application/hdoihUG0FmYC8GdoFEc` o ID é `hdoihUG0FmYC8GdoFEc` |
| `DOKPLOY_API_TOKEN` | No Dokploy: **Profile** → **Generate API Key** (ou equivalente) |

Depois disso, cada push em `main`/`master` com CI verde vai disparar o deploy no Dokploy.

---

## Opção 2: Auto Deploy + Webhook (sem GitHub Action)

Se preferir que o **próprio Dokploy** escute o GitHub e faça o deploy:

1. No Dokploy, abra o seu **Application** (ou Compose).
2. Em **General** (ou configurações do serviço), ative **Auto Deploy**.
3. Nas **Deployment logs** (ou na tela de webhook), copie a **URL do webhook** que o Dokploy mostra.
4. No GitHub: **Settings** → **Webhooks** → **Add webhook**:
   - **Payload URL:** a URL copiada do Dokploy
   - **Content type:** `application/json`
   - **Events:** “Just the push event” (ou o que o Dokploy indicar)
   - Salve.

A partir daí, cada push no repositório (na branch que o Dokploy monitora) dispara o deploy.  
Nesse caso você pode **desativar** o job `deploy-dokploy` no workflow (ou removê-lo) para não ter duas formas de deploy ao mesmo tempo.

---

## Resumo do fluxo (Opção 1)

```
Push em main/master
  → CI: lint, test, build
  → E2E: Postgres + migrate + test:e2e
  → Deploy: GitHub Action chama Dokploy → build/deploy no seu servidor
```

Se algo falhar no CI ou no E2E, o deploy **não** roda.
