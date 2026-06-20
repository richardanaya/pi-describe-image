# Configuration Examples

These are example `describe-image.json` configurations for different providers.

Copy the appropriate one to your project as `.pi/describe-image.json` or to `~/.pi/describe-image.json`.

## Anthropic (Claude)

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
```

Requires `ANTHROPIC_API_KEY` environment variable, or set `apiKey` in the config.

## OpenAI (GPT)

```json
{
  "provider": "openai",
  "model": "gpt-5.2"
}
```

Requires `OPENAI_API_KEY` environment variable, or set `apiKey` in the config.

## Google (Gemini)

```json
{
  "provider": "google",
  "model": "gemini-2.5-pro"
}
```

Requires `GOOGLE_GENERATIVE_AI_API_KEY` environment variable (or OAuth via `/login`).

## xAI (Grok)

```json
{
  "provider": "xai",
  "model": "grok-4-1-fast"
}
```

Requires `XAI_API_KEY` environment variable, or set `apiKey` directly in the config:

```json
{
  "provider": "xai",
  "model": "grok-4-1-fast",
  "apiKey": "xai-your-api-key"
}
```

## AWS Bedrock (Claude)

```json
{
  "provider": "amazon-bedrock",
  "model": "anthropic.claude-sonnet-4-20250514-v1:0"
}
```

Requires AWS credentials configured via standard AWS methods.

## Finding Available Models

Run `pi /models` to see all available models and their vision capabilities (look for `input: ["text", "image"]`).
