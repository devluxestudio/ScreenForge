import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { app } from "electron";

export interface RecentProject {
	id: string;
	name: string;
	projectFolder: string;
	entryFilePath: string | null;
	lastOpened: number;
}

let db: Database.Database | null = null;

export function initDb() {
	if (db) return;

	const userDataPath = app.getPath("userData");
	const dbPath = path.join(userDataPath, "screenforge.db");

	db = new Database(dbPath);

	// Create table if it doesn't exist
	db.exec(`
		CREATE TABLE IF NOT EXISTS recent_projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			projectFolder TEXT NOT NULL,
			entryFilePath TEXT,
			lastOpened INTEGER NOT NULL
		)
	`);
}

export function addOrUpdateRecentProject(project: RecentProject) {
	if (!db) initDb();

	const stmt = db!.prepare(`
		INSERT INTO recent_projects (id, name, projectFolder, entryFilePath, lastOpened)
		VALUES (@id, @name, @projectFolder, @entryFilePath, @lastOpened)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			projectFolder = excluded.projectFolder,
			entryFilePath = excluded.entryFilePath,
			lastOpened = excluded.lastOpened
	`);

	stmt.run(project);
}

export function getRecentProjects(): RecentProject[] {
	if (!db) initDb();

	const stmt = db!.prepare(`
		SELECT id, name, projectFolder, entryFilePath, lastOpened
		FROM recent_projects
		ORDER BY lastOpened DESC
	`);

	const projects = stmt.all() as RecentProject[];

	// Verify that the folders actually exist, filter out if deleted
	const validProjects: RecentProject[] = [];
	for (const p of projects) {
		if (fs.existsSync(p.projectFolder)) {
			validProjects.push(p);
		} else {
			removeRecentProject(p.id);
		}
	}

	return validProjects;
}

export function removeRecentProject(id: string) {
	if (!db) initDb();

	const stmt = db!.prepare("DELETE FROM recent_projects WHERE id = ?");
	stmt.run(id);
}
