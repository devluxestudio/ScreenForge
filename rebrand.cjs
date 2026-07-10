const fs = require("fs");
const path = require("path");

const filesToProcess = fs
	.readFileSync("matches_utf8.txt", "utf8")
	.split("\n")
	.map((l) => l.trim())
	.filter((l) => l.length > 0);

for (const file of filesToProcess) {
	try {
		const filePath = path.join(__dirname, file);
		if (!fs.existsSync(filePath)) {
			console.log(`File not found: ${file}`);
			continue;
		}

		let content = fs.readFileSync(filePath, "utf8");

		// Case-sensitive replacements
		content = content.replace(/OpenScreen/g, "ScreenForge");
		content = content.replace(/openscreen/g, "screenforge");
		content = content.replace(/Open Screen/g, "Screen Forge");
		content = content.replace(/open screen/g, "screen forge");
		content = content.replace(/OPENSCREEN/g, "SCREENFORGE");

		fs.writeFileSync(filePath, content, "utf8");
		console.log(`Updated ${file}`);
	} catch (e) {
		console.error(`Error processing ${file}: ${e.message}`);
	}
}

// Rename directories and files
const renames = [
	[".harness/reins/openscreen-dev", ".harness/reins/screenforge-dev"],
	[".harness/reins/openscreen-reviewer", ".harness/reins/screenforge-reviewer"],
	[".harness/reins/openscreen-tester", ".harness/reins/screenforge-tester"],
	[
		"electron/native/screencapturekit/Sources/OpenScreenScreenCaptureKitHelper",
		"electron/native/screencapturekit/Sources/ScreenForgeScreenCaptureKitHelper",
	],
	["scripts/capture-openscreen-preview.mjs", "scripts/capture-screenforge-preview.mjs"],
];

for (const [oldPath, newPath] of renames) {
	const fullOld = path.join(__dirname, oldPath);
	const fullNew = path.join(__dirname, newPath);
	if (fs.existsSync(fullOld)) {
		fs.renameSync(fullOld, fullNew);
		console.log(`Renamed ${oldPath} to ${newPath}`);
	}
}

console.log("Rebranding complete!");
