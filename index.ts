import { Type, completeSimple, getModel, type ImageContent } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";

/**
 * Image Description Extension for pi
 *
 * Provides a `describe_image` tool that uses vision models to describe images.
 * Configuration is read from describe-image.json in the project or agent directory.
 *
 * describe-image.json format:
 * {
 *   "provider": "anthropic",              // Required: provider name
 *   "model": "claude-sonnet-4-20250514"   // Required: model ID
 * }
 *
 * Config search order:
 *   1. <cwd>/.pi/describe-image.json
 *   2. ~/.pi/describe-image.json
 */

interface DescribeImageConfig {
	provider: string;
	model: string;
}

interface ToolParams {
	path?: string;
	url?: string;
	prompt?: string;
}

const DEFAULT_PROMPT = "Describe this image in detail. What do you see?";

/**
 * Load configuration from describe-image.json
 * Searches in order:
 * 1. Current working directory: .pi/describe-image.json
 * 2. Global directory: ~/.pi/describe-image.json
 */
function loadConfig(cwd: string): DescribeImageConfig | undefined {
	// Try project config first
	const projectPath = resolve(cwd, ".pi", "describe-image.json");
	if (existsSync(projectPath)) {
		try {
			const content = readFileSync(projectPath, "utf-8");
			const config = JSON.parse(content) as DescribeImageConfig;
			if (isValidConfig(config)) {
				return config;
			}
		} catch {
			// Fall through to global config
		}
	}

	// Try global config in ~/.pi/
	const globalPath = resolve(homedir(), ".pi", "describe-image.json");
	if (existsSync(globalPath)) {
		try {
			const content = readFileSync(globalPath, "utf-8");
			const config = JSON.parse(content) as DescribeImageConfig;
			if (isValidConfig(config)) {
				return config;
			}
		} catch {
			// Config file invalid, will return undefined
		}
	}

	return undefined;
}

function isValidConfig(config: unknown): config is DescribeImageConfig {
	if (typeof config !== "object" || config === null) return false;
	const c = config as Record<string, unknown>;
	return typeof c.provider === "string" && typeof c.model === "string";
}

/**
 * Convert a local image file to ImageContent
 */
async function fileToImageContent(imagePath: string): Promise<ImageContent> {
	const resolvedPath = resolve(imagePath);
	const data = await readFile(resolvedPath);
	const base64 = data.toString("base64");

	// Detect MIME type from file extension
	const ext = resolvedPath.split(".").pop()?.toLowerCase();
	let mimeType = "image/png";
	switch (ext) {
		case "jpg":
		case "jpeg":
			mimeType = "image/jpeg";
			break;
		case "gif":
			mimeType = "image/gif";
			break;
		case "webp":
			mimeType = "image/webp";
			break;
		case "png":
		default:
			mimeType = "image/png";
	}

	return { type: "image", data: base64, mimeType };
}

/**
 * Download an image from URL and convert to ImageContent
 */
async function urlToImageContent(imageUrl: string): Promise<ImageContent> {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
	}

	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.startsWith("image/")) {
		throw new Error(`URL does not point to an image (content-type: ${contentType})`);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	const base64 = buffer.toString("base64");

	return { type: "image", data: base64, mimeType: contentType };
}

/**
 * Get ImageContent from either path or URL
 */
async function getImageContent(params: ToolParams): Promise<ImageContent> {
	if (params.url) {
		return urlToImageContent(params.url);
	}
	if (params.path) {
		return fileToImageContent(params.path);
	}
	throw new Error("Either 'path' or 'url' must be provided");
}

export default function describeImageExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "describe_image",
		label: "Describe Image",
		description:
			"Describe an image using a vision model. Accepts either a local file path or a URL, and an optional prompt. " +
			"Requires describe-image.json config with 'provider' and 'model' fields.",
		parameters: Type.Object({
			path: Type.Optional(
				Type.String({
					description: "Absolute or relative path to a local image file to describe",
				}),
			),
			url: Type.Optional(
				Type.String({
					description: "URL of an image to download and describe",
				}),
			),
			prompt: Type.Optional(
				Type.String({
					description:
						"Custom prompt guiding what to describe about the image. Can ask for general description or focus on specific aspects (colors, objects, text, style, mood, etc.). Default: 'Describe this image in detail. What do you see?'",
				}),
			),
		}),

		async execute(toolCallId, params: ToolParams, signal, onUpdate, ctx) {
			// Load configuration
			const config = loadConfig(ctx.cwd);

			if (!config) {
				throw new Error(
					"No describe-image.json configuration found. " +
						"Create .pi/describe-image.json in your project or ~/.pi/describe-image.json " +
						'with: { "provider": "anthropic", "model": "claude-sonnet-4-20250514" }',
				);
			}

			// Get the model
			const model = getModel(config.provider as any, config.model as any);
			if (!model) {
				throw new Error(
					`Model "${config.provider}/${config.model}" not found. ` +
						"Check your describe-image.json configuration.",
				);
			}

			// Check that model supports image input
			if (!model.input.includes("image")) {
				throw new Error(
					`Model "${config.provider}/${config.model}" does not support image input. ` +
						"Choose a vision-capable model.",
				);
			}

			// Get API key and headers
			const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
			if (!auth.ok) {
				throw new Error(`Authentication failed: ${auth.error}`);
			}
			if (!auth.apiKey) {
				throw new Error(`No API key available for provider "${config.provider}"`);
			}

			onUpdate?.({
				content: [{ type: "text", text: `Analyzing image with ${config.provider}/${config.model}...` }],
				details: { provider: config.provider, model: config.model },
			});

			// Get image content
			const imageContent = await getImageContent(params);

			// Prepare the context with image and prompt
			const prompt = params.prompt || DEFAULT_PROMPT;
			const context = {
				messages: [
					{
						role: "user" as const,
						content: [
							{ type: "text" as const, text: prompt },
							imageContent,
						],
						timestamp: Date.now(),
					},
				],
			};

			// Call the vision model
			const response = await completeSimple(model, context, {
				apiKey: auth.apiKey,
				headers: auth.headers,
				signal,
			});

			// Extract description from response
			const description = response.content
				.filter((c) => c.type === "text")
				.map((c) => (c as { text: string }).text)
				.join("\n");

			if (!description.trim()) {
				throw new Error("Model returned empty description");
			}

			return {
				content: [{ type: "text", text: description }],
				details: {
					provider: config.provider,
					model: config.model,
					source: params.path || params.url,
					mimeType: imageContent.mimeType,
					inputTokens: response.usage.input,
					outputTokens: response.usage.output,
				},
			};
		},
	});
}
