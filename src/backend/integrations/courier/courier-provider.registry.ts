// TODO(stub): not implemented
import { CourierProvider } from "./courier.types";

export class CourierRegistry {
  private providers: Map<string, CourierProvider> = new Map();

  hasProvider(id: string): boolean {
    return this.providers.has(id.toLowerCase());
  }

  getProvider(id: string): CourierProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  getAllProviders(): CourierProvider[] {
    return Array.from(this.providers.values());
  }
}

export const courierRegistry = new CourierRegistry();
export const courierProviderRegistry = courierRegistry;
