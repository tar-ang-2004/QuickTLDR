import { Summary } from '../summarizer/schema';

export interface SummarizeRequest {
  type: 'SUMMARIZE_TAB';
}

export interface ExtractTextRequest {
  type: 'EXTRACT_TEXT';
}

export interface SummaryResponse {
  type: 'SUMMARY_RESPONSE';
  data: Summary;
}

export interface ErrorResponse {
  type: 'ERROR';
  message: string;
}

export type ExtensionRequest = SummarizeRequest | ExtractTextRequest;

export type ExtensionResponse = SummaryResponse | ErrorResponse;

export function isSummarizeRequest(obj: unknown): obj is SummarizeRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'SUMMARIZE_TAB'
  );
}

export function isExtractTextRequest(obj: unknown): obj is ExtractTextRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'EXTRACT_TEXT'
  );
}

export function isSummaryResponse(obj: unknown): obj is SummaryResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'SUMMARY_RESPONSE' &&
    'data' in obj
  );
}

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'ERROR' &&
    'message' in obj &&
    typeof (obj as ErrorResponse).message === 'string'
  );
}