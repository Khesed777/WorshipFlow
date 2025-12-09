// src/activityLogger.js
import * as FileSystem from 'expo-file-system/legacy';

const LOG_FILE = FileSystem.documentDirectory + 'activity_log.txt';

export async function logActivityToFile(action, table, recordId = null, details = null) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${action} on ${table}${recordId ? ` (ID: ${recordId})` : ''}${details ? ` | Details: ${JSON.stringify(details)}` : ''}\n`;
    try {
        // First try to read existing content, then append
        let existingContent = '';
        try {
            existingContent = await FileSystem.readAsStringAsync(LOG_FILE);
        } catch (e) {
            // File doesn't exist yet, that's ok
        }
        await FileSystem.writeAsStringAsync(LOG_FILE, existingContent + entry);
    } catch (err) {
        console.error('Failed to write activity log:', err);
    }
}

export async function readActivityLogFile() {
    try {
        const contents = await FileSystem.readAsStringAsync(LOG_FILE);
        return contents;
    } catch (err) {
        return '';
    }
}

export { LOG_FILE };
