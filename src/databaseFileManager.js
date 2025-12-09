// src/databaseFileManager.js
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const DB_FILE_NAME = 'worship_flow_new.db';
const DB_PATH = `${FileSystem.DocumentDirectoryPath}/${DB_FILE_NAME}`;

/**
 * Get the full path to the database file
 */
export const getDBPath = () => DB_PATH;

/**
 * Get database file info (size, last modified)
 */
export const getDBFileInfo = async () => {
    try {
        const info = await FileSystem.getInfoAsync(DB_PATH);
        return {
            exists: info.exists,
            size: info.size || 0,
            modificationTime: info.modificationTime || null,
            path: DB_PATH,
        };
    } catch (error) {
        console.error('Error getting DB file info:', error);
        throw error;
    }
};

/**
 * Share a copy of the database file
 */
export const shareDatabase = async () => {
    try {
        const fileInfo = await getDBFileInfo();
        
        if (!fileInfo.exists) {
            throw new Error('Database file not found');
        }

        // Create a copy in cache to share
        const shareFileName = `WorshipFlow_DB_${new Date().toISOString().split('T')[0]}.db`;
        const cacheDir = `${FileSystem.CacheDirectory}${shareFileName}`;
        
        // Copy DB to cache directory for sharing
        await FileSystem.copyAsync({
            from: DB_PATH,
            to: cacheDir,
        });

        // Share the file
        await Sharing.shareAsync(cacheDir, {
            mimeType: 'application/x-sqlite3',
            dialogTitle: 'Share Your WorshipFlow Database',
        });

        console.log('Database shared successfully');
    } catch (error) {
        console.error('Error sharing database:', error);
        throw error;
    }
};

/**
 * Save a copy to the Files app / Downloads directory
 */
export const saveDatabaseToFiles = async () => {
    try {
        const fileInfo = await getDBFileInfo();
        
        if (!fileInfo.exists) {
            throw new Error('Database file not found');
        }

        // Create filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `WorshipFlow_Backup_${timestamp}.db`;

        // For Android, save to Downloads directory
        const downloadsPath = `${FileSystem.DocumentDirectoryPath}/../Downloads/${fileName}`;
        
        // Copy DB to Downloads or Documents
        await FileSystem.copyAsync({
            from: DB_PATH,
            to: downloadsPath,
        });

        return {
            success: true,
            fileName,
            path: downloadsPath,
            message: `Database saved to Downloads as ${fileName}`,
        };
    } catch (error) {
        console.error('Error saving database to files:', error);
        throw error;
    }
};

/**
 * Restore database from a backup file
 */
export const restoreDatabaseFromFile = async () => {
    try {
        // Note: Using Sharing picker or manual file selection via file system
        // For now, we'll use a simpler approach - save to a specific location and user selects it
        Alert.alert(
            'Restore Database',
            'Place your backup DB file in the app documents folder and tap OK to restore.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'OK',
                    onPress: async () => {
                        // User would need to manually place backup in documents folder
                        // This is a simplified approach for Expo
                    },
                },
            ]
        );
    } catch (error) {
        console.error('Error restoring database:', error);
        throw error;
    }
};

/**
 * Export database details as text (for viewing in app)
 */
export const getDBFileDetails = async () => {
    try {
        const info = await getDBFileInfo();
        const sizeInMB = (info.size / (1024 * 1024)).toFixed(2);
        const lastModified = new Date(info.modificationTime * 1000).toLocaleString();

        return {
            fileName: DB_FILE_NAME,
            path: DB_PATH,
            size: `${sizeInMB} MB`,
            sizeBytes: info.size,
            lastModified,
            exists: info.exists,
        };
    } catch (error) {
        console.error('Error getting DB details:', error);
        throw error;
    }
};
