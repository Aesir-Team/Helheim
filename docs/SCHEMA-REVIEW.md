# Análise do schema Prisma – Nível profissional

## O que já está bom

- **Soft delete** (deletedAt) em User, Manga, Chapter.
- **Índices** coerentes (slug, status, FKs, compostos para consultas comuns).
- **Enums** para status e níveis de acesso.
- **Relações** bem definidas (Cascade/Restrict/SetNull).
- **Navegação** prev/next em Chapter.
- **Uniques** onde faz sentido (slug, userId+chapterId+weekStart, etc.).

---

## Lacunas críticas (recomendado implementar)

### 1. **Histórico de coins (auditoria e transparência)**

Hoje só existe `User.coinsBalance`. Não há registro de:
- quando o usuário ganhou coins (anúncio, bônus, promoção);
- quando gastou (desbloqueio de capítulo);
- possíveis estornos ou correções.

**Risco:** sem histórico, não há como auditar, contestar ou exibir “extrato” ao usuário.

**Solução:** model `CoinTransaction` (userId, amount, type, referenceId, createdAt). Ver schema atualizado.

---

### 2. **Biblioteca / favoritos**

Não existe “minha lista” ou “continuar lendo”:
- usuário não consegue marcar mangás como favoritos;
- não há progresso de leitura (último capítulo/página).

**Impacto:** retenção e UX ficam fracas.

**Solução:** `UserMangaFavorite` (ou Library) e `ReadingProgress` (userId, chapterId, pageNumber, lastReadAt). Ver schema atualizado.

---

### 3. **Idempotência em pagamentos**

Webhooks (Mercado Pago, Stripe) podem reenviar o mesmo evento. Sem idempotência, um pagamento pode ser creditado mais de uma vez.

**Solução:** campo `idempotencyKey` (ou `externalEventId`) em `Payment`, com unique, para ignorar processamentos duplicados.

---

### 4. **Snapshot do plano na assinatura**

`Subscription` referencia `Plan` por FK. Se o plano mudar (preço, nome, benefícios), o histórico da assinatura fica inconsistente.

**Solução:** guardar cópia dos dados no momento da assinatura (ex.: `planNameAtSubscription`, `priceInCentsAtSubscription`) em `Subscription`. Opcional mas recomendado para relatórios e suporte.

---

### 5. **User: campos comuns de perfil e produto**

Para um produto mais profissional, costuma-se ter em User (ou em Profile separado):

- `emailVerifiedAt` (confirmação de email).
- `avatarUrl` (foto de perfil).
- `locale` / `timezone` (i18n e notificações).
- `lastLoginAt` (segurança e analytics).
- `phone` (opcional, 2FA ou recuperação).

Não são obrigatórios no dia 1, mas fazem parte de um roadmap “profissional”.

---

### 6. **Notificações in-app**

Para “novo capítulo do seu mangá favorito” ou “assinatura renovada”:

- model `UserNotification` (userId, type, title, body, readAt, entityType, entityId, createdAt).

Pode ser fase 2, mas o schema pode já deixar espaço (ex.: tabela criada depois).

---

### 7. **Moderação / denúncias**

Para conteúdo (capítulo, comentário futuro, etc.):

- model `Report` (reporterId, reportableType, reportableId, reason, status, createdAt).

Útil para LGPD e políticas de uso.

---

### 8. **Configuração global (feature flags / limites)**

Valores como “limite padrão de capítulos por semana” ou flags de funcionalidade hoje ficam no código. Para mudar sem deploy:

- model `AppConfig` (key, value, description) ou uso de variáveis de ambiente + tabela de config.

---

### 9. **Integridade de saldo**

Garantir `coinsBalance >= 0` e consistência com `CoinTransaction`:

- no app: sempre atualizar saldo via transação atômica e criar `CoinTransaction`;
- opcional: CHECK constraint em migration SQL (`coins_balance >= 0`).

---

### 10. **Pagamento: método e recibo**

Para suporte e contabilidade:

- `paymentMethod` (pix, card, etc.) – enum ou string;
- `receiptUrl` ou `invoiceUrl` – link para comprovante, quando o gateway fornecer.

---

## Resumo de prioridades

| Prioridade | Item                         | Motivo principal                    |
|-----------|------------------------------|-------------------------------------|
| Alta      | CoinTransaction              | Auditoria e extrato de coins        |
| Alta      | UserMangaFavorite            | Retenção e “minha lista”            |
| Alta      | ReadingProgress              | “Continuar lendo”                   |
| Alta      | Idempotency em Payment       | Evitar duplicar crédito em webhook  |
| Média     | Snapshot do plano em Subscription | Histórico correto de preços/nome   |
| Média     | User (emailVerifiedAt, avatar, locale) | Produto mais completo              |
| Média     | UserNotification             | Engajamento e renovação             |
| Baixa     | Report / AppConfig           | Moderação e configuração sem deploy |

---

Os modelos **CoinTransaction**, **UserMangaFavorite**, **ReadingProgress** e o campo **idempotencyKey** em Payment foram adicionados ao schema. Os demais itens podem ser implementados em fases seguintes.
