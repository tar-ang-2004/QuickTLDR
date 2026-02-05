export type Domain = string;

export type TextLength = number;

export type Timestamp = number;

export type UsageCounter = number;

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type Nullable<T> = T | null;

export type AsyncResult<T> = Promise<Result<T>>;