export type AppDocument = {
  /** Name the student sees and the saved file gets, e.g. "Contrat-ChezToi-2027-1.pdf". */
  fileName: string;
  sizeBytes?: number;
  /**
   * asset: bundled demo file.
   * url: short‑lived signed URL from the private `rental-contracts` bucket (real data).
   */
  source: { kind: 'asset'; module: number } | { kind: 'url'; url: string };
};
