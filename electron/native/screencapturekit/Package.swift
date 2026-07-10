// swift-tools-version: 5.9

import PackageDescription

let package = Package(
	name: "ScreenForgeScreenCaptureKitHelper",
	platforms: [
		.macOS(.v13)
	],
	products: [
		.executable(
			name: "screenforge-screencapturekit-helper",
			targets: ["ScreenForgeScreenCaptureKitHelper"]
		),
		.executable(
			name: "screenforge-macos-cursor-helper",
			targets: ["ScreenForgeMacOSCursorHelper"]
		)
	],
	targets: [
		.executableTarget(
			name: "ScreenForgeScreenCaptureKitHelper",
			path: "Sources/ScreenForgeScreenCaptureKitHelper"
		),
		.executableTarget(
			name: "ScreenForgeMacOSCursorHelper",
			path: "Sources/ScreenForgeMacOSCursorHelper"
		)
	]
)
