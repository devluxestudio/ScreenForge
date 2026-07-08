const fs = require("fs");
const path = "src/components/video-editor/SettingsPanel.tsx";
let content = fs.readFileSync(path, "utf8");
content = content.replace(/editor-panel-section p-3/g, "editor-panel-section p-2");
content = content.replace(
	/className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-0"/g,
	'className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-0"',
);
fs.writeFileSync(path, content);
console.log("Done");
