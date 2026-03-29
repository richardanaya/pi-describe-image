# pi-describe-image

A pi extension that provides a `describe_image` tool to analyze and describe images using vision-capable AI models.

> **When to use this:** This extension is primarily useful when your **main conversation model doesn't have vision capabilities** (e.g., older models, text-only APIs, or lightweight local models), but you still need to analyze images. You can keep using your preferred model for text/chat while delegating image descriptions to a dedicated vision model (Claude, GPT-4o, Gemini, etc.).

## Quick Start

```bash
# 1. Install the extension
cd ~/workbench/pi-describe-image
ln -s "$(pwd)" ~/.pi/extensions/pi-describe-image

# 2. Create configuration
cd ~/my-project
mkdir -p .pi
cat > .pi/describe-image.json << 'EOF'
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
EOF

# 3. Set your API key
export ANTHROPIC_API_KEY="your-api-key"

# 4. Reload pi and test
cd ~/my-project
pi /reload
# Then ask: "Describe this image: https://example.com/photo.jpg"
```

## Installation

### Option 1: Install via npm (recommended)

```bash
pi install npm:pi-describe-image
```

### Option 2: Install from git

```bash
pi install git:github.com/richardanaya/pi-describe-image
```

### Option 3: Local development

```bash
ln -s /path/to/pi-describe-image ~/.pi/extensions/pi-describe-image
```

Then reload pi: `pi /reload`

## Configuration

Create a `describe-image.json` configuration file with just two fields: `provider` and `model`.

### Project-level config (recommended)
Create `.pi/describe-image.json` in your project root:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
```

### Global config
Create `~/.pi/describe-image.json`:

```json
{
  "provider": "openai",
  "model": "gpt-5.2"
}
```

Config search order:
1. `<cwd>/.pi/describe-image.json` (project-specific)
2. `~/.pi/describe-image.json` (global fallback)

## Usage

Once configured, the `describe_image` tool is available for the LLM to use. This is especially helpful when your main model lacks vision - the LLM can "see" images by calling out to a vision-capable model on demand:

```
User: What's in this image? https://example.com/photo.jpg

User: Read the text from this screenshot: ./screenshot.png

User: What colors are in this image? https://example.com/painting.jpg
```

The LLM can pass a custom `prompt` parameter to control how the image is described (general description, extract text, analyze style, etc.). If no prompt is given, it uses a default: "Describe this image in detail. What do you see?"

## Tool Parameters

- `path` - Local file path to an image
- `url` - URL of an image (either path or url required)
- `prompt` - (Optional) Custom instructions for how to describe the image

## Supported Providers & Models

Any model that supports image input can be used. Some popular options:

### Anthropic
- `claude-sonnet-4-20250514` (recommended)
- `claude-opus-4-20250514`
- `claude-sonnet-3-7-20250219`

### OpenAI
- `gpt-5.2`
- `gpt-5.3`
- `gpt-5.4`
- `gpt-4o`

### Google
- `gemini-2.5-pro`
- `gemini-2.0-flash`

### AWS Bedrock
- `anthropic.claude-sonnet-4-20250514-v1:0`
- `amazon.nova-pro-v1:0`

## Configuration Format

```json
{
  "provider": "<provider-name>",  // Required: e.g., "anthropic", "openai"
  "model": "<model-id>"          // Required: specific model ID
}
```

## API Key Setup

The extension uses the same API key resolution as pi's core:

1. OAuth credentials (if provider supports /login)
2. Environment variables (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
3. Configured API keys in `~/.pi/agent/config.json`

## Error Handling

Common errors and solutions:

- **"No describe-image.json configuration found"** - Create the config file
- **"Model not found"** - Check the provider/model ID in your config
- **"Model does not support image input"** - Use a vision-capable model
- **"No API key available"** - Configure your API key for the selected provider

## License

MIT
