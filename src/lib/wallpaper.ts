import { getAssetPath } from "@/lib/assetPath";

export const WALLPAPER_PATHS: readonly string[] = [
	"/wallpapers/12-Dark-thumbnail.jpg",
	"/wallpapers/12-Light-thumbnail.jpg",
	"/wallpapers/13-Ventura-Dark-thumb.jpg",
	"/wallpapers/13-Ventura-Light-thumb.jpg",
	"/wallpapers/14-Sonoma-Dark-thumb.jpg",
	"/wallpapers/14-Sonoma-Light-thumb.jpg",
	"/wallpapers/15-Sequoia-Dark-thumbnail.jpg",
	"/wallpapers/15-Sequoia-Light-thumbnail.jpg",
	"/wallpapers/15-Sequoia-Sunrise.png",
	"/wallpapers/26-Tahoe-Beach-Day-thumb.jpeg",
	"/wallpapers/26-Tahoe-Dark-6K-thumb.jpeg",
	"/wallpapers/26-Tahoe-Light-6K-thumb.jpeg",
	"/wallpapers/27-Golden-Gate-thumb-dark.png",
	"/wallpapers/27-Golden-Gate-thumb.jpg",
	"/wallpapers/aluminium-os-5000x5000-26374.jpg",
	"/wallpapers/macbook-neo-stock-5120x3202-25819.jpg",
	"/wallpapers/macos-sonoma-3840x2160-11574.jpeg",
	"/wallpapers/macos-tahoe-beach-6016x3384-24083.jpg",
	"/wallpapers/vivo-pad-6-pro-3840x3840-26312.jpg",
	"/wallpapers/windows 11-1.png",
	"/wallpapers/windows 11-2.png",
	"/wallpapers/windows 11-4.jpg",
	"/wallpapers/windows 11-7.png",
	"/wallpapers/windows-11-fluidic-3840x2160-20744.png",
	"/wallpapers/windows-11-fluidic-3840x2160-20747.png",
];

export const WALLPAPER_COUNT = WALLPAPER_PATHS.length;

export const DEFAULT_WALLPAPER = WALLPAPER_PATHS[0];

export type WallpaperClassification =
	| { kind: "color"; value: string }
	| { kind: "gradient"; value: string }
	| { kind: "image"; path: string };

const GRADIENT_RE = /^(repeating-)?(linear|radial|conic)-gradient\(/;
const COLOR_FUNC_RE = /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/;
const IMAGE_URL_RE = /^(\/|https?:\/\/|file:\/\/|data:)/;

export function classifyWallpaper(value: string): WallpaperClassification {
	const trimmed = value.trim();
	if (trimmed === "") {
		return { kind: "color", value: "#000000" };
	}
	if (trimmed.startsWith("#") || COLOR_FUNC_RE.test(trimmed)) {
		return { kind: "color", value: trimmed };
	}
	if (GRADIENT_RE.test(trimmed)) {
		return { kind: "gradient", value: trimmed };
	}
	if (IMAGE_URL_RE.test(trimmed)) {
		return { kind: "image", path: trimmed };
	}
	return { kind: "color", value: trimmed };
}

const ALLOWED_IMAGE_PREFIX = "/wallpapers/";

export class UnsafeImagePrefixError extends Error {
	constructor(prefix: string) {
		super(`Image wallpaper path must live under ${prefix}`);
		this.name = "UnsafeImagePrefixError";
	}
}

export function resolveImageWallpaperUrl(imagePath: string): string {
	if (
		imagePath.startsWith("http://") ||
		imagePath.startsWith("https://") ||
		imagePath.startsWith("file://") ||
		imagePath.startsWith("data:")
	) {
		return imagePath;
	}
	const withLeadingSlash = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
	if (!withLeadingSlash.startsWith(ALLOWED_IMAGE_PREFIX)) {
		throw new BackgroundLoadError(imagePath, new UnsafeImagePrefixError(ALLOWED_IMAGE_PREFIX));
	}
	try {
		return getAssetPath(withLeadingSlash.slice(1));
	} catch (cause) {
		if (cause instanceof BackgroundLoadError) throw cause;
		throw new BackgroundLoadError(imagePath, cause);
	}
}

export class BackgroundLoadError extends Error {
	readonly url: string;
	readonly cause?: unknown;

	constructor(url: string, cause?: unknown) {
		super(`Failed to load background image: ${displayBasename(url)}`);
		this.name = "BackgroundLoadError";
		this.url = url;
		this.cause = cause;
	}

	get displayUrl(): string {
		return displayBasename(this.url);
	}
}

function displayBasename(url: string): string {
	if (url.startsWith("data:")) {
		return "data:…";
	}
	try {
		const parsed = new URL(url);
		const last = parsed.pathname.split("/").filter(Boolean).pop();
		return last ? decodeURIComponent(last) : "(unknown)";
	} catch {
		const last = url.split("/").filter(Boolean).pop();
		return last ?? "(unknown)";
	}
}
