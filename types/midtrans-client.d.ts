declare module "midtrans-client" {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionResult {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: Record<string, unknown>): Promise<TransactionResult>;
  }

  class CoreApi {
    constructor(config: MidtransConfig);
    transaction: {
      status(orderId: string): Promise<Record<string, unknown>>;
    };
  }

  export { Snap, CoreApi };
}
