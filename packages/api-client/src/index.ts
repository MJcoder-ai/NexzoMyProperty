import type { Identifier, TenantSummary } from '@nexzo/types';

export interface ApiClientOptions {
  baseUrl: string;
  tenantId: Identifier;
  token?: string;
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async fetchTenant(): Promise<TenantSummary> {
    const response = await fetch(`${this.options.baseUrl}/v1/tenants/${this.options.tenantId}`, {
      headers: this.buildHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to load tenant: ${response.status}`);
    }

    return (await response.json()) as TenantSummary;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.options.tenantId as string
    };

    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }

    return headers;
  }
}
