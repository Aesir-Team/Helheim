import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ExternalChapterDetailDto,
  ExternalMangaDetailDto,
  ExternalMangaGatewayPort,
  ExternalMangaSummaryDto,
  ListExternalMangasParams,
  ListExternalTrendingParams,
} from '../../application/ports/external-manga-gateway.port';
import { ExternalMangaGatewayHttpError } from './external-manga-gateway-http.error';
import {
  extractMangaArrayPayload,
  mapToChapterDetail,
  mapToMangaDetail,
  mapToMangaSummary,
} from './nexustoons-json.mapper';
import { decryptResponse } from './orion-crypto';

@Injectable()
export class NexustoonsMangaGateway implements ExternalMangaGatewayPort {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const raw = this.config.get<string>(
      'EXTERNAL_MANGA_BASE_URL',
      'https://nexustoons.com',
    );
    return raw.replace(/\/$/, '');
  }

  private buildListMangasUrl(params: ListExternalMangasParams): string {
    const url = new URL(`${this.baseUrl}/api/mangas`);
    if (params.search != null && params.search !== '') {
      url.searchParams.set('search', params.search);
    }
    if (params.limit != null) {
      url.searchParams.set('limit', String(params.limit));
    }
    if (params.includeNsfw != null) {
      url.searchParams.set('includeNsfw', String(params.includeNsfw));
    }
    if (params.sortBy != null) {
      url.searchParams.set('sortBy', params.sortBy);
    }
    return url.toString();
  }

  private buildTrendingUrl(params: ListExternalTrendingParams): string {
    const url = new URL(`${this.baseUrl}/api/mangas/trending`);
    if (params.limit != null) {
      url.searchParams.set('limit', String(params.limit));
    }
    if (params.includeNsfw != null) {
      url.searchParams.set('includeNsfw', String(params.includeNsfw));
    }
    return url.toString();
  }

  async listMangas(
    params: ListExternalMangasParams,
  ): Promise<ExternalMangaSummaryDto[]> {
    const json: unknown = await this.fetchJson(
      this.buildListMangasUrl(params),
      'GET',
    );
    return extractMangaArrayPayload(json)
      .map((item) => mapToMangaSummary(item))
      .filter((m): m is ExternalMangaSummaryDto => m !== null);
  }

  async listTrending(
    params: ListExternalTrendingParams,
  ): Promise<ExternalMangaSummaryDto[]> {
    const json: unknown = await this.fetchJson(
      this.buildTrendingUrl(params),
      'GET',
    );
    return extractMangaArrayPayload(json)
      .map((item) => mapToMangaSummary(item))
      .filter((m): m is ExternalMangaSummaryDto => m !== null);
  }

  async getMangaBySlug(slug: string): Promise<ExternalMangaDetailDto | null> {
    const json = await this.fetchJsonOrNull(
      `${this.baseUrl}/api/manga/${encodeURIComponent(slug)}`,
      'getMangaBySlug',
    );
    if (!json) return null;
    return mapToMangaDetail(json);
  }

  async getChapterById(
    chapterId: string,
  ): Promise<ExternalChapterDetailDto | null> {
    const json = await this.fetchJsonOrNull(
      `${this.baseUrl}/api/chapter/${encodeURIComponent(chapterId)}`,
      'getChapterById',
    );
    if (!json) return null;
    return mapToChapterDetail(json);
  }

  private async fetchJsonOrNull(url: string, label: string): Promise<unknown> {
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new ExternalMangaGatewayHttpError(
        `Nexustoons ${label} failed: ${res.status}`,
        res.status,
      );
    }
    const raw: unknown = await res.json();
    return decryptResponse(raw);
  }

  private async fetchJson(url: string, method: 'GET'): Promise<unknown> {
    const res = await fetch(url, { method });
    if (!res.ok) {
      throw new ExternalMangaGatewayHttpError(
        `Nexustoons request failed: ${res.status} ${url}`,
        res.status,
      );
    }
    const raw: unknown = await res.json();
    return decryptResponse(raw);
  }
}
