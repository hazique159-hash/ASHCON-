declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware from a verified access token. */
      user?: {
        id: string;
        sessionId: string;
        roles: string[];
      };
    }
  }
}

export {};
