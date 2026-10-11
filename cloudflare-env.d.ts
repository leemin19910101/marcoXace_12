declare namespace Cloudflare {
  interface Env {
    EDITOR_USERNAME?: string;
    EDITOR_PASSWORD?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
