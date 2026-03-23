# Produto e regras de negócio — Midgard Core API

Documento em **visão de Product Owner**: o que o produto é, para quem, quais regras a API deve garantir e em que ordem priorizamos. Complementa `MVP-GUIDE.md` e `PROJECT-OVERVIEW.md` com foco em **lógica de negócio** e **comportamento esperado**, não em implementação técnica.

---

## 1. Visão do produto

**O que somos**  
Um **catálogo / indexador** de mangás, manhwas e manhuas. O app oferece descoberta, organização (listas), leitura com boa UX e **controle de acesso** (plano gratuito com limite, assinatura ilimitada, e no futuro desbloqueio por coins).

**O que não somos**  
- Não somos hospedeiros primários das imagens: o conteúdo visual vem de **fontes de terceiros**; a API referencia URLs e metadados.  
- Não substituímos os termos de uso e avisos legais no app (modal de aceite, transparência ao usuário).

**Objetivo de negócio**  
Entregar valor ao leitor (catálogo rico, continuar lendo, listas) com **monetização sustentável** (assinatura + opcionalmente coins) e **risco jurídico mitigado** (canal de takedown, clareza de papel de intermediário).

---

## 2. Usuários e papéis

| Papel | Descrição |
|-------|-----------|
| **Visitante** | Pode ver partes públicas do catálogo conforme produto definir; ações que exigem identidade exigem cadastro. |
| **Usuário registrado** | Conta com email/senha (ou evolução futura OAuth). Identidade para listas, progresso, limites e assinatura. |
| **Assinante** | Usuário com plano pago ativo: leitura **ilimitada** dentro das regras do produto (sem contar capítulos na cota semanal gratuita). |
| **Usuário gratuito** | Plano sem custo: pode ler/baixar até **X capítulos distintos por semana** (X vem do `Plan` / configuração). |
| **VIP / Moderador / Admin** | Papéis internos (schema `Role`): podem ter privilégios de acesso ampliado ao catálogo; regra de produto: “do VIP para cima, acesso liberado” onde aplicável. |
| **Titular de direitos** | Pessoa que solicita **retirada de conteúdo** via fluxo de takedown (com login), alinhado a notice & takedown. |

---

## 3. Domínios de negócio e regras

### 3.1 Autenticação e perfil

**Regras**

- Registro com email único; senha armazenada de forma segura (hash); não expor senha em nenhuma resposta.  
- Login emite **JWT** para sessão nas rotas protegidas.  
- Perfil: leitura e atualização de dados básicos (nome, etc.); email pode ter regra própria (confirmação futura).  
- Operações de **lista, progresso, assinatura, coins e takedown** exigem usuário identificado (JWT válido).

**Critérios de aceite (PO)**

- Duplicidade de email no registro → erro claro (conflito).  
- Credenciais inválidas no login → não revelar se o email existe ou não (mensagem neutra).  
- Rotas protegidas sem token ou token inválido → não autorizado.

---

### 3.2 Catálogo (mangás, capítulos, páginas, categorias)

**Regras**

- Cada **mangá** tem metadados (título, slug único, capa, status, tipo, descrição, categorias, etc.).  
- **Capítulos** pertencem a um mangá; têm número (string para suportar “12.5”), título opcional, status de publicação, **nível de acesso** (`public` ou `coin`) e custo em coins quando aplicável.  
- **Páginas** do capítulo: ordem + URL da imagem (referência externa).  
- **Categorias** (gênero/tema) para filtros e descoberta.

**Critérios de aceite**

- Slug de mangá único; par `(mangaId, number)` único por capítulo.  
- Navegação prev/next resolvida por `ORDER BY number` (sem campos de linked list no BD).  
- Conteúdo com **soft delete** (`deletedAt`) não deve aparecer para o usuário final nas listagens normais.  
- NSFW pode ser flag no mangá para o front filtrar conforme política do app.

---

### 3.3 Sincronização com fonte externa (banco primeiro)

**Regra de ouro**  
**Sempre consultar o nosso banco primeiro.** Nossa base é a **fonte de verdade operacional** para o app.

**Comportamento**

1. **Mangá já existe no BD**  
   - Retornar dados do BD.  
   - Se passou tempo suficiente desde a última sincronização e ninguém está sincronizando, **disparar atualização em background** (ex.: 1x por dia, primeiro usuário que “abrir” o mangá não bloqueia a resposta).

2. **Mangá não existe no BD**  
   - Tentar **buscar na API/scrape de terceiros**, persistir e retornar; se a fonte não tiver → 404.

3. **Concorrência**  
   - Evitar dois syncs simultâneos no mesmo mangá (estado `syncStatus`: idle / syncing / error).  
   - Sync **não** deve travar a resposta HTTP principal (fila ou job assíncrono).

**Critérios de aceite**

- Usuário sempre recebe resposta rápida com o que já temos; dados frescos chegam em segundo plano.  
- Erros de sync ficam registrados para diagnóstico sem derrubar o catálogo inteiro.

---

### 3.4 Acesso à leitura e download (limite semanal e capítulos “coin”)

**Objetivo de negócio**  
Equilibrar **uso gratuito** (atração) com **incentivo à assinatura** e, no futuro, **coins**.

**Regras — plano gratuito (limite semanal)**

- Definir **quantos capítulos distintos** o usuário pode **acessar** (ler ou baixar) **por semana ISO 8601** (segunda-feira 00:00:00 UTC como início da janela).  
- Cada capítulo **novo** na semana consome **uma unidade** da cota (idempotência: mesmo capítulo na mesma semana não consome duas vezes).  
- Ao **atingir o limite**: bloquear **leitura e download** de novos capítulos até a próxima janela semanal — resposta clara (403 + motivo).

**Regras — assinante (plano ilimitado)**

- **Sem limite** de capítulos por semana para leitura no escopo do plano (campo `freeChaptersPerWeek` nulo no plano).

**Regras — capítulo com `accessLevel = coin`**

- Usuário precisa:  
  - **já ter desbloqueado** esse capítulo (pagamento único em coins), **ou**  
  - ter **saldo suficiente** e confirmar desbloqueio (débito + registro permanente de desbloqueio).  
- Capítulo `public` segue as regras de limite semanal / ilimitado, sem custo em coins.

**Regras — papéis VIP/Admin (produto)**

- Conforme definido no schema de negócio: certos papéis podem **ignorar** limite gratuito para consumo de catálogo.

**Critérios de aceite**

- Sempre que o app solicitar conteúdo do capítulo, a API valida **CheckAccess** antes de devolver páginas.  
- Consumo de cota e desbloqueio por coins em **transação** consistente (sem saldo negativo, sem double spend).

---

### 3.5 Listas do usuário

**Regras**

- Usuário cria **listas com nome livre** (ex.: “Favoritos”, “Lendo”, “Quero ler”).  
- Um mesmo mangá pode estar em **várias listas** do mesmo usuário.  
- CRUD de listas e de itens (adicionar/remover mangá).  
- Opcionalmente: ordenação de listas e de itens; contagem de itens e quantos mangás já têm progresso de leitura (`mangasReadCount`) para UX.

**Critérios de aceite**

- Usuário A não acessa listas do usuário B.  
- Remover lista remove itens em cascata (regra de produto: ok perder itens da lista, não o mangá do sistema).

---

### 3.6 Progresso de leitura (“continuar lendo”)

**Regras**

- Por par **(usuário, mangá)** existe **no máximo um** registro de progresso atual: último **capítulo** e **página**, data da última leitura.  
- Ao avançar no leitor, o app (ou API) **atualiza** esse registro (upsert).  
- “Continuar lendo” lista os mangás com progresso recente (ordenado por `lastReadAt`).

**Critérios de aceite**

- Idempotência: múltiplos PATCH com os mesmos dados não corrompem o estado.  
- Capítulo removido ou indisponível: produto define mensagem amigável (retry / obra indisponível).

---

### 3.7 Planos e assinatura (fundação no MVP; checkout pós-MVP)

**Regras**

- **Planos** cadastrados (gratuito, mensal, anual, etc.) com: nome, slug, descrição, **limite semanal** (número ou `null` = ilimitado), preço em centavos, intervalo de cobrança.  
- **Assinatura** liga usuário a um plano com status (ativa, cancelada, expirada), datas de início/fim e **snapshot** do nome/preço no momento da compra (histórico).  
- Usuário gratuito efetivo = plano com limite semanal > 0 ou política default definida pelo negócio.  
- **MVP:** seed do plano gratuito + resolução do plano efetivo do usuário (sem checkout). **Pós-MVP:** checkout, cobrança recorrente, troca de plano.

**Critérios de aceite**

- No máximo **uma assinatura ativa** por usuário a qualquer momento (invariante garantida pela aplicação).  
- Troca de plano ou expiração reflete no **CheckAccess** na próxima leitura.  
- Histórico de assinaturas não é apagado ao mudar preço do plano no catálogo de planos.  
- Plano não é removido do BD; desativação via `isActive = false` (preserva histórico).

---

### 3.8 Pagamentos (Mercado Pago — fase 2)

**Regras**

- Checkout gera intenção de pagamento no gateway; retorno via redirect ou SDK.  
- **Webhook** confirma pagamento; processamento **idempotente** (mesmo evento do gateway não duplica assinatura nem cobrança).  
- Registrar `Payment` com status (pendente, pago, falhou, estornado).

**Critérios de aceite**

- Falha de pagamento não ativa assinatura.  
- Pagamento confirmado ativa ou renova `Subscription` de forma auditável.

---

### 3.9 Coins e anúncios

**Regras**

- **1 anúncio completado = X coins** (X configurável por ambiente ou config).  
- Crédito só após chamada autenticada à API com **idempotencyKey única por exibição**; replay da mesma chave **não** credita de novo.  
- Todo movimento de saldo gera **registro de auditoria** (`CoinTransaction`).  
- Desbloqueio de capítulo: débito atômico + `UserChapterCoinUnlock` + transação tipo `chapter_unlock`.  
- Opcional: **limite diário** de recompensas por anúncio anti-abuso.

**Critérios de aceite**

- Saldo nunca negativo.  
- Todo `CoinTransaction` deve gravar `balanceAfter` com o saldo real pós-operação (campo obrigatório).  
- Extrato do usuário bate com a soma dos lançamentos.

---

### 3.10 Notice & takedown (retirada de conteúdo)

**Regras**

- Pedido de retirada **exige usuário logado** (rastreabilidade, redução de abuso).  
- Formulário: obra alvo, motivo, identificação do solicitante, **declaração de legitimidade** aceita.  
- Status do pedido: pendente, aprovado, rejeitado; equipe interna processa; resposta pode ser por email ou in-app (definição de produto).

**Critérios de aceite**

- Pedido associado a `userId` e `mangaId`.  
- Termos de uso no app descrevem o papel de intermediário e o canal de notificação.

---

## 4. Priorização (visão PO)

| Fase | Entregas de negócio |
|------|---------------------|
| **MVP (P0/P1)** | Auth, catálogo completo na API, sync banco→fallback, **acesso com limite semanal + bloqueio**, listas, progresso e continuar lendo. |
| **Curto prazo** | Planos + assinatura + pagamento (Mercado Pago) integrados ao CheckAccess. |
| **Em seguida** | Coins, anúncios com idempotência, desbloqueio por coins; opcional limite diário de ads. |
| **Compliance / confiança** | Fluxo de takedown; conteúdo legal estático ou CMS leve (`content/legal-notice`, `about`). |

---

## 5. Fluxos resumidos (linguagem de negócio)

1. **Descobrir mangá** → listar/buscar no catálogo (dados do BD).  
2. **Abrir ficha** → detalhe + capítulos; sync em background se necessário.  
3. **Abrir capítulo** → verificar login; verificar plano e cota; se coin, verificar desbloqueio/saldo; se ok, registrar consumo/desbloqueio e **então** entregar páginas.  
4. **Ler** → atualizar progresso; “continuar lendo” reflete na próxima sessão.  
5. **Organizar** → criar listas e adicionar obras.  
6. **Monetizar (futuro)** → assinar → ilimitado; ou assistir anúncio → coins → desbloquear capítulo premium em coins.  
7. **Titular de direitos** → enviar pedido de retirada logado → backoffice trata.

---

## 6. Indicadores que o PO pode acompanhar (sugestão)

- Cadastros e DAU/WAU (fora da API, analytics).  
- Conversão free → assinante (pagamentos).  
- Capítulos consumidos por semana (distribuição por faixa de uso).  
- Volume de desbloqueios por coins vs assinatura.  
- Tempo médio de resposta a pedidos de takedown.  
- Erros de sync por mangá/fonte.

---

## 7. Documentos relacionados

| Documento | Conteúdo |
|-----------|----------|
| `PLANO-MVP.md` | Plano de execução do MVP (fases, entregas, DoD, dependências). |
| `NEXUSTOONS-GATEWAY.md` | Documentação do adapter externo Nexustoons. |
| `MULTIPLE-MANGA-SOURCES.md` | Modelo multi-fonte para o mesmo mangá (se recriado). |
| `.cursor/rules/midgard-core-api.mdc` | Regras operacionais para o time e IA. |
| `prisma/schema.prisma` | Modelo de dados (fonte de verdade do BD). |

---

*Última atualização: alinhado ao `prisma/schema.prisma` e às regras do repositório Midgard Core API.*
