/**
 * Erros de domínio reutilizáveis (shared).
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends DomainError {
  readonly reasonCode: string;

  constructor(message: string, reasonCode: string) {
    super(message);
    this.reasonCode = reasonCode;
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/** Nenhuma linha do hub elegível para sync/leitura (com linhas cadastradas). */
export class MangaSourceUnavailableError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'MangaSourceUnavailableError';
    Object.setPrototypeOf(this, MangaSourceUnavailableError.prototype);
  }
}
