export type PlatformResultMeta = Readonly<{
  correlationId?: string;
  source?: string;
  emittedAt?: string;
  [key: string]: unknown;
}>;

export type PlatformSuccess<TData> = Readonly<{
  ok: true;
  data: TData;
  meta?: PlatformResultMeta;
}>;

export type PlatformFailure<TError> = Readonly<{
  ok: false;
  error: TError;
  meta?: PlatformResultMeta;
}>;

export type PlatformResult<TData, TError = Error> =
  | PlatformSuccess<TData>
  | PlatformFailure<TError>;

export type Result<TValue, TError = Error> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function fail<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export function platformOk<TData>(
  data: TData,
  meta?: PlatformResultMeta,
): PlatformResult<TData, never> {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function platformFail<TError>(
  error: TError,
  meta?: PlatformResultMeta,
): PlatformResult<never, TError> {
  return meta ? { ok: false, error, meta } : { ok: false, error };
}

export function isPlatformSuccess<TData, TError>(
  result: PlatformResult<TData, TError>,
): result is PlatformSuccess<TData> {
  return result.ok;
}

export function isPlatformFailure<TData, TError>(
  result: PlatformResult<TData, TError>,
): result is PlatformFailure<TError> {
  return !result.ok;
}
