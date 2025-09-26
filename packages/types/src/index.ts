export type Identifier = string & { readonly brand: unique symbol };

export interface TenantSummary {
  id: Identifier;
  name: string;
}

export const createIdentifier = (value: string): Identifier => value as Identifier;
