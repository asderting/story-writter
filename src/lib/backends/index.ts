// ============================================================================
// Story Studio - Backend Adapter Layer
// ============================================================================
//
// Modular adapter system supporting:
//   - LM Studio (OpenAI-compatible local server)
//   - Ollama (native API)
//   - OpenAI-compatible endpoints (custom URL + optional API key)
// ============================================================================

import type { Backend, BackendType } from '../../types';

// --- Core Types ---

export interface CompletionRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
  stream?: boolean;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
}

export interface BackendAdapter {
  testConnection(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generateCompletion(request: CompletionRequest): Promise<string>;
  generateCompletionStream(request: CompletionRequest): AsyncGenerator<string>;
}

export interface ConnectionTestResult {
  success: boolean;
  models?: string[];
  error?: string;
}

// --- SSE Parsing Utility ---

/**
 * Parses a Server-Sent Events stream and yields text content chunks.
 * Handles the `data: ` prefix, `[DONE]` sentinel, and multi-line buffering.
 */
async function* parseSSEStream(
  response: Response,
  extractContent: (parsed: Record<string, unknown>) => string | null
): AsyncGenerator<string> {
  if (!response.body) {
    throw new BackendError('Response body is null; streaming is not supported.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from the buffer
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (trimmed === '' || trimmed.startsWith(':')) continue;

        // Handle SSE data lines
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);

          // Check for stream termination
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            const content = extractContent(parsed);
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON chunks silently; they may be partial or keep-alive frames
          }
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim().startsWith('data: ')) {
      const data = buffer.trim().slice(6);
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const content = extractContent(parsed);
          if (content) {
            yield content;
          }
        } catch {
          // Ignore trailing partial data
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// --- Custom Error ---

export class BackendError extends Error {
  public readonly backendType?: BackendType;
  public readonly statusCode?: number;

  constructor(message: string, backendType?: BackendType, statusCode?: number) {
    super(message);
    this.name = 'BackendError';
    this.backendType = backendType;
    this.statusCode = statusCode;
  }
}

// --- Helpers ---

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

async function fetchWithErrorHandling(
  url: string,
  options: RequestInit,
  backendType: BackendType,
  context: string
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    throw new BackendError(
      `Failed to connect to ${backendType} backend (${context}): ${message}`,
      backendType
    );
  }

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch {
      // Ignore read errors on error responses
    }
    throw new BackendError(
      `${backendType} backend returned HTTP ${response.status} (${context}): ${body}`,
      backendType,
      response.status
    );
  }

  return response;
}

// ============================================================================
// LM Studio Adapter
// ============================================================================
// LM Studio exposes an OpenAI-compatible API on port 1234 by default.
// Models are listed via GET /v1/models.
// Completions use POST /v1/chat/completions.
// ============================================================================

function createLMStudioAdapter(backend: Backend): BackendAdapter {
  const baseUrl = stripTrailingSlash(backend.baseUrl || 'http://localhost:1234/v1');
  const apiKey = backend.apiKey || 'lm-studio'; // LM Studio accepts any key

  function headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  }

  return {
    async testConnection(): Promise<boolean> {
      const response = await fetchWithErrorHandling(
        `${baseUrl}/models`,
        { method: 'GET', headers: headers() },
        'lm-studio',
        'testConnection'
      );
      const data = (await response.json()) as { data?: unknown[] };
      return Array.isArray(data?.data);
    },

    async listModels(): Promise<string[]> {
      const response = await fetchWithErrorHandling(
        `${baseUrl}/models`,
        { method: 'GET', headers: headers() },
        'lm-studio',
        'listModels'
      );
      const data = (await response.json()) as {
        data?: Array<{ id: string }>;
      };
      if (!Array.isArray(data?.data)) {
        throw new BackendError(
          'LM Studio /models response did not contain a valid model list.',
          'lm-studio'
        );
      }
      return data.data.map((m) => m.id);
    },

    async generateCompletion(request: CompletionRequest): Promise<string> {
      const body = buildOpenAIRequestBody(request, false);
      const response = await fetchWithErrorHandling(
        `${baseUrl}/chat/completions`,
        { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        'lm-studio',
        'generateCompletion'
      );
      const data = (await response.json()) as OpenAIChatResponse;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new BackendError(
          'LM Studio response did not contain a valid completion.',
          'lm-studio'
        );
      }
      return content;
    },

    async *generateCompletionStream(
      request: CompletionRequest
    ): AsyncGenerator<string> {
      const body = buildOpenAIRequestBody(request, true);
      const response = await fetchWithErrorHandling(
        `${baseUrl}/chat/completions`,
        { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        'lm-studio',
        'generateCompletionStream'
      );
      yield* parseSSEStream(response, extractOpenAIStreamContent);
    },
  };
}

// ============================================================================
// Ollama Adapter
// ============================================================================
// Ollama serves on port 11434 by default.
// Models are listed via GET /api/tags.
// Chat completions use POST /api/chat (native Ollama format, not OpenAI).
// Streaming uses newline-delimited JSON (not SSE).
// ============================================================================

interface OllamaChatResponse {
  message?: { content?: string };
  done?: boolean;
}

interface OllamaTagsResponse {
  models?: Array<{ name: string; model: string }>;
}

function createOllamaAdapter(backend: Backend): BackendAdapter {
  const baseUrl = stripTrailingSlash(backend.baseUrl || 'http://localhost:11434');

  function headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (backend.apiKey) {
      h['Authorization'] = `Bearer ${backend.apiKey}`;
    }
    return h;
  }

  return {
    async testConnection(): Promise<boolean> {
      // Ollama responds to GET / with a "Ollama is running" message
      const response = await fetchWithErrorHandling(
        baseUrl,
        { method: 'GET', headers: headers() },
        'ollama',
        'testConnection'
      );
      const text = await response.text();
      return text.length > 0;
    },

    async listModels(): Promise<string[]> {
      const response = await fetchWithErrorHandling(
        `${baseUrl}/api/tags`,
        { method: 'GET', headers: headers() },
        'ollama',
        'listModels'
      );
      const data = (await response.json()) as OllamaTagsResponse;
      if (!Array.isArray(data?.models)) {
        throw new BackendError(
          'Ollama /api/tags response did not contain a valid model list.',
          'ollama'
        );
      }
      return data.models.map((m) => m.name);
    },

    async generateCompletion(request: CompletionRequest): Promise<string> {
      const body = buildOllamaRequestBody(request, false);
      const response = await fetchWithErrorHandling(
        `${baseUrl}/api/chat`,
        { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        'ollama',
        'generateCompletion'
      );
      const data = (await response.json()) as OllamaChatResponse;
      const content = data?.message?.content;
      if (typeof content !== 'string') {
        throw new BackendError(
          'Ollama response did not contain a valid completion.',
          'ollama'
        );
      }
      return content;
    },

    async *generateCompletionStream(
      request: CompletionRequest
    ): AsyncGenerator<string> {
      const body = buildOllamaRequestBody(request, true);
      const response = await fetchWithErrorHandling(
        `${baseUrl}/api/chat`,
        { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        'ollama',
        'generateCompletionStream'
      );

      // Ollama streams newline-delimited JSON (not SSE)
      yield* parseOllamaStream(response);
    },
  };
}

/**
 * Parses Ollama's newline-delimited JSON streaming format.
 * Each line is a complete JSON object with { message: { content }, done }.
 */
async function* parseOllamaStream(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new BackendError('Response body is null; streaming is not supported.', 'ollama');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;

        try {
          const parsed = JSON.parse(trimmed) as OllamaChatResponse;
          if (parsed.done) return;
          const content = parsed.message?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as OllamaChatResponse;
        const content = parsed.message?.content;
        if (content && !parsed.done) {
          yield content;
        }
      } catch {
        // Ignore trailing partial data
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function buildOllamaRequestBody(
  request: CompletionRequest,
  stream: boolean
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    stream,
  };

  const options: Record<string, unknown> = {};

  if (request.temperature !== undefined) options.temperature = request.temperature;
  if (request.topP !== undefined) options.top_p = request.topP;
  if (request.maxTokens !== undefined) options.num_predict = request.maxTokens;
  if (request.stopSequences?.length) options.stop = request.stopSequences;
  if (request.frequencyPenalty !== undefined) options.frequency_penalty = request.frequencyPenalty;
  if (request.presencePenalty !== undefined) options.presence_penalty = request.presencePenalty;
  if (request.seed !== undefined) options.seed = request.seed;

  if (Object.keys(options).length > 0) {
    body.options = options;
  }

  return body;
}

// ============================================================================
// OpenAI-Compatible Adapter
// ============================================================================
// Generic adapter for any OpenAI-compatible API endpoint.
// Uses /v1/chat/completions and /v1/models.
// ============================================================================

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
    finish_reason?: string;
  }>;
}

function createOpenAICompatibleAdapter(backend: Backend): BackendAdapter {
  const rawUrl = stripTrailingSlash(backend.baseUrl || 'http://localhost:8080');
  // Ensure the base URL ends with /v1 for consistency
  const baseUrl = rawUrl.endsWith('/v1') ? rawUrl : `${rawUrl}/v1`;

  function headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (backend.apiKey) {
      h['Authorization'] = `Bearer ${backend.apiKey}`;
    }
    return h;
  }

  return {
    async testConnection(): Promise<boolean> {
      const response = await fetchWithErrorHandling(
        `${baseUrl}/models`,
        { method: 'GET', headers: headers() },
        'openai-compatible',
        'testConnection'
      );
      const data = (await response.json()) as { data?: unknown[] };
      return Array.isArray(data?.data);
    },

    async listModels(): Promise<string[]> {
      const response = await fetchWithErrorHandling(
        `${baseUrl}/models`,
        { method: 'GET', headers: headers() },
        'openai-compatible',
        'listModels'
      );
      const data = (await response.json()) as {
        data?: Array<{ id: string }>;
      };
      if (!Array.isArray(data?.data)) {
        throw new BackendError(
          'OpenAI-compatible /models response did not contain a valid model list.',
          'openai-compatible'
        );
      }
      return data.data.map((m) => m.id);
    },

    async generateCompletion(request: CompletionRequest): Promise<string> {
      const body = buildOpenAIRequestBody(request, false);
      const response = await fetchWithErrorHandling(
        `${baseUrl}/chat/completions`,
        { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        'openai-compatible',
        'generateCompletion'
      );
      const data = (await response.json()) as OpenAIChatResponse;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new BackendError(
          'OpenAI-compatible response did not contain a valid completion.',
          'openai-compatible'
        );
      }
      return content;
    },

    async *generateCompletionStream(
      request: CompletionRequest
    ): AsyncGenerator<string> {
      const body = buildOpenAIRequestBody(request, true);
      const response = await fetchWithErrorHandling(
        `${baseUrl}/chat/completions`,
        { method: 'POST', headers: headers(), body: JSON.stringify(body) },
        'openai-compatible',
        'generateCompletionStream'
      );
      yield* parseSSEStream(response, extractOpenAIStreamContent);
    },
  };
}

// --- OpenAI shared helpers ---

function buildOpenAIRequestBody(
  request: CompletionRequest,
  stream: boolean
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    stream,
  };

  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.topP !== undefined) body.top_p = request.topP;
  if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
  if (request.stopSequences?.length) body.stop = request.stopSequences;
  if (request.frequencyPenalty !== undefined) body.frequency_penalty = request.frequencyPenalty;
  if (request.presencePenalty !== undefined) body.presence_penalty = request.presencePenalty;
  if (request.seed !== undefined) body.seed = request.seed;

  return body;
}

/**
 * Extracts text content from an OpenAI-format streaming chunk.
 * Streaming chunks use `choices[0].delta.content`.
 */
function extractOpenAIStreamContent(parsed: Record<string, unknown>): string | null {
  const choices = parsed.choices as
    | Array<{ delta?: { content?: string } }>
    | undefined;
  if (!choices || choices.length === 0) return null;
  const content = choices[0]?.delta?.content;
  return typeof content === 'string' ? content : null;
}

// ============================================================================
// Factory & Public API
// ============================================================================

/**
 * Creates a BackendAdapter for the given backend configuration.
 * Routes to the correct adapter implementation based on `backend.type`.
 */
export function createBackendAdapter(backend: Backend): BackendAdapter {
  switch (backend.type) {
    case 'lm-studio':
      return createLMStudioAdapter(backend);
    case 'ollama':
      return createOllamaAdapter(backend);
    case 'openai-compatible':
      return createOpenAICompatibleAdapter(backend);
    default:
      throw new BackendError(
        `Unsupported backend type: ${(backend as Backend).type}`
      );
  }
}

/**
 * Tests connectivity to a backend and returns available models on success.
 * This is a convenience wrapper that catches errors and returns a structured result.
 */
export async function testBackendConnection(
  backend: Backend
): Promise<ConnectionTestResult> {
  try {
    const adapter = createBackendAdapter(backend);
    const connected = await adapter.testConnection();

    if (!connected) {
      return { success: false, error: 'Connection test returned false.' };
    }

    const models = await adapter.listModels();
    return { success: true, models };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error occurred.';
    return { success: false, error: message };
  }
}
