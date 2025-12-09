// src/database.js
import * as SQLite from 'expo-sqlite';

// Use the proper method based on your environment (Expo vs Bare React Native)
const databaseName = 'worship_flow_new.db';

// ✅ REAL EXPO DATABASE IMPLEMENTATION ENABLED
const openDB = () => SQLite.openDatabaseAsync(databaseName);

export async function initDB() {
    const database = await openDB();

    // SQL statements are now flush left to prevent hidden whitespace errors
    await database.runAsync(`
CREATE TABLE IF NOT EXISTS Song (
    song_id INTEGER PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    key TEXT,
    lyrics TEXT,
    category TEXT,
    type TEXT
);
`);

    await database.runAsync(`
CREATE TABLE IF NOT EXISTS Setlist (
    setlist_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    date_created TEXT,
    description TEXT
);
`);

    await database.runAsync(`
CREATE TABLE IF NOT EXISTS ProgramPart (
    part_id INTEGER PRIMARY KEY NOT NULL,
    setlist_id INTEGER NOT NULL,
    song_id INTEGER,
    title TEXT,
    FOREIGN KEY (setlist_id) REFERENCES Setlist (setlist_id),
    FOREIGN KEY (song_id) REFERENCES Song (song_id)
);
`);

    await database.runAsync(`
CREATE TABLE IF NOT EXISTS VoiceMemo (
    memo_id INTEGER PRIMARY KEY NOT NULL,
    setlist_id INTEGER NOT NULL, 
    part_id INTEGER,
    file_path TEXT NOT NULL,
    date_recorded TEXT,
    duration INTEGER,
    FOREIGN KEY (setlist_id) REFERENCES Setlist (setlist_id),
    FOREIGN KEY (part_id) REFERENCES ProgramPart (part_id)
);
`);

    // Ensure older DBs get a part_id column on VoiceMemo if missing
    try {
        await database.runAsync(`ALTER TABLE VoiceMemo ADD COLUMN part_id INTEGER;`);
    } catch (err) {
        // ignore errors (column likely exists)
    }

    // Ensure older DBs get a duration column on VoiceMemo if missing
    try {
        await database.runAsync(`ALTER TABLE VoiceMemo ADD COLUMN duration INTEGER;`);
    } catch (err) {
        // ignore errors (column likely exists)
    }

    return database;
}