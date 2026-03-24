const PRIVILEGED_CATALOG_READER_ROLES = new Set<string>([
  'VIP',
  'ADMIN',
  'MODERATOR',
]);

/** Papéis que ignoram bloqueio por coin em leitura/listagem (alinhado a `CheckChapterAccessUseCase`). */
export function isPrivilegedCatalogReaderRole(role: string): boolean {
  return PRIVILEGED_CATALOG_READER_ROLES.has(role);
}
