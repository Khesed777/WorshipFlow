import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, TextInput, Button, Text, StyleSheet, Alert, 
    ScrollView, FlatList, Pressable, Modal, TouchableOpacity, 
    Platform, StatusBar, Image 
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { initDB } from './src/database'; 
import SetlistDetailScreen from './src/SetlistDetailScreen'; 
import Metronome from './Metronome';

// --- Component: AllSongsScreen ---
const AllSongsScreen = ({ songs, onSongPress, onClose }) => {
    
    const renderSongItem = ({ item }) => (
        <Pressable 
            style={styles.setlistItemCard} 
            onPress={() => onSongPress(item)}
        >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDetail}>{item.artist}</Text>
            <Text style={styles.cardDetail}>Key: {item.key || 'N/A'}</Text>
        </Pressable>
    );

    return (
        <View style={styles.allSongsContainer}>
            <Text style={styles.allSongsHeading}>All Saved Songs ({songs.length})</Text>
            <View style={styles.separator} />
            <FlatList
                data={songs}
                renderItem={renderSongItem}
                keyExtractor={item => item.song_id.toString()}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyList}>No songs saved. Add one from the home screen!</Text>}
            />
            <TouchableOpacity
                style={[styles.closeButton, styles.closeModalButton, {maxHeight: 50, marginTop: 20, marginBottom: 20 }]}
                onPress={onClose}
            >
                <Text style={styles.closeButtonText}>Return to Home</Text>
            </TouchableOpacity>
        </View>
    );
};

// --- Component: AddPictureScreen (Practice Resources) ---
const AddPictureScreen = ({ onClose }) => {
    // Placeholder image URI - replace with actual resource if needed
    return (
        <ScrollView contentContainerStyle={styles.pictureScreenContainer} style={styles.scrollContainer}>
            <Text style={styles.pictureScreenHeading}>Worship Flow Resources</Text>
             <Metronome />
             <Image source={require('./assets/myImage.jpg')} style={{ width: 300, height: 400 }} />
           {/* You may want to insert the placeholder image here: */}
            {/* <Image source={{ uri: placeholderImageUri }} style={styles.resourceImage} /> */}
           
            
            <TouchableOpacity
                style={[styles.closeButton, styles.closeModalButton, {maxHeight: 50, marginTop: 30 }]}
                onPress={onClose}
            >
                <Text style={styles.closeButtonText}>Return to Home</Text>
            </TouchableOpacity>
        </ScrollView>
    );
    
};

// --- Component: App ---
export default function App() {
    const [db, setDb] = useState(null);
    const [songs, setSongs] = useState([]); 
    const [setlists, setSetlists] = useState([]);
    const [programParts, setProgramParts] = useState([]);
    const [voiceMemos, setVoiceMemos] = useState([]);
    const [renderKey, setRenderKey] = useState(0); 

    const [currentSetlist, setCurrentSetlist] = useState(null); 

    const [modalVisible, setModalVisible] = useState(false); 
    const [songFormModalVisible, setSongFormModalVisible] = useState(false); 
    const [setlistFormModalVisible, setSetlistFormModalVisible] = useState(false); 
    const [pictureScreenVisible, setPictureScreenVisible] = useState(false); 
    const [allSongsScreenVisible, setAllSongsScreenVisible] = useState(false); 
    const [selectedSong, setSelectedSong] = useState(null); 
    
    const [isCollapsed, setIsCollapsed] = useState(true);

    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [key, setKey] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [category, setCategory] = useState('');
    const [type, setType] = useState('');
    const [setlistName, setSetlistName] = useState('');
    const [setlistDescription, setSetlistDescription] = useState('');

    const loadAllData = useCallback(async () => {
        if (!db) return; 
        try {
            const allSongs = await db.getAllAsync('SELECT * FROM Song ORDER BY title ASC;');
            const allSetlists = await db.getAllAsync('SELECT * FROM Setlist;');
            const allProgramParts = await db.getAllAsync('SELECT * FROM ProgramPart;');
            const allVoiceMemos = await db.getAllAsync('SELECT * FROM VoiceMemo;');

            setSongs(allSongs);
            setSetlists(allSetlists);
            setProgramParts(allProgramParts);
            setVoiceMemos(allVoiceMemos);
            
            setRenderKey(prevKey => prevKey + 1); 
        } catch (error) {
            console.error('Error loading data from tables:', error);
            Alert.alert('Load Error', 'Failed to retrieve all data from DB.');
        }
    }, [db]);

    useEffect(() => {
        async function prepareDb() {
            try {
                const database = await initDB();
                setDb(database);
            } catch (err) {
                console.error('Failed to initialize DB:', err);
            }
        }
        prepareDb();
    }, []); 
    
    useEffect(() => {
        if (db) {
            loadAllData();
        }
    }, [db, loadAllData]);


    const addSong = () => {
        if (!title || !artist) { Alert.alert('Validation', 'Please enter at least title and artist.'); return; }
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }
        db.runAsync(
            `INSERT INTO Song (title, artist, key, lyrics, category, type) VALUES (?, ?, ?, ?, ?, ?)`,
            [title, artist, key, lyrics, category, type]
        )
        .then(() => {
            Alert.alert('Success', 'Song added successfully!');
            setTitle(''); setArtist(''); setKey(''); setLyrics(''); setCategory(''); setType('');
            setSongFormModalVisible(false);
            loadAllData();
        })
        .catch((error) => {
            console.error('Insert error:', error);
            Alert.alert('Error', 'Failed to add song.');
        });
    };
    
    const deleteSong = async (songId) => {
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }
        
        Alert.alert(
            "Confirm Deletion",
            "Are you sure you want to delete this song? This will unlink it from all setlist parts.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await db.runAsync(`UPDATE ProgramPart SET song_id = NULL WHERE song_id = ?`, [songId]);
                            await db.runAsync(`DELETE FROM Song WHERE song_id = ?`, [songId]);

                            setModalVisible(false);
                            setSelectedSong(null);
                            await loadAllData(); 

                            Alert.alert('Success', 'Song deleted successfully!');

                        } catch (error) {
                            console.error('Delete song error:', error);
                            Alert.alert('Error', 'Failed to delete song.');
                        }
                    }
                }
            ]
        );
    };


    const addSetlist = () => {
        if (!setlistName) { Alert.alert('Validation', 'Please enter a name for the Setlist.'); return; }
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }

        const dateCreated = new Date().toISOString().split('T')[0];
        db.runAsync(
            `INSERT INTO Setlist (name, date_created, description) VALUES (?, ?, ?)`,
            [setlistName, dateCreated, setlistDescription]
        )
        .then(() => {
            Alert.alert('Success', 'Setlist created successfully!');
            setSetlistName('');
            setSetlistDescription('');
            setSetlistFormModalVisible(false);
            loadAllData();
        })
        .catch((error) => {
            console.error('Insert Setlist error:', error);
            Alert.alert('Error', 'Failed to create setlist.');
        });
    };
    
    const deleteSetlist = async (setlistId) => {
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }

        Alert.alert(
            "Confirm Setlist Deletion",
            "Are you sure you want to delete this setlist? This will permanently delete all associated parts and voice memos.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            // 1. Delete associated ProgramParts
                            await db.runAsync(`DELETE FROM ProgramPart WHERE setlist_id = ?`, [setlistId]);

                            // 2. Delete associated VoiceMemos (files and DB records)
                            const memosToDelete = voiceMemos.filter(m => m.setlist_id === setlistId);
                            for (const memo of memosToDelete) {
                                try {
                                    const fileInfo = await FileSystem.getInfoAsync(memo.file_path); 
                                    if (fileInfo.exists) {
                                        await FileSystem.deleteAsync(memo.file_path, { idempotent: true });
                                    }
                                } catch (fileError) {
                                    console.warn(`Could not delete file for memo ID ${memo.memo_id}:`, fileError);
                                }
                            }
                            await db.runAsync(`DELETE FROM VoiceMemo WHERE setlist_id = ?`, [setlistId]);

                            // 3. Delete the Setlist itself
                            await db.runAsync(`DELETE FROM Setlist WHERE setlist_id = ?`, [setlistId]);
                            
                            setCurrentSetlist(null);
                            await loadAllData(); 
                            Alert.alert('Success', 'Setlist and all related data deleted successfully!');
                        } catch (error) {
                            console.error('Delete setlist error:', error);
                            Alert.alert('Error', 'Failed to delete setlist.');
                        }
                    }
                }
            ]
        );
    };
    
    const addProgramPart = async (setlistId, partTitle) => {
        if (!partTitle) { Alert.alert('Validation', 'Title cannot be empty.'); return; }
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }

        try {
            const result = await db.runAsync(`INSERT INTO ProgramPart (setlist_id, title) VALUES (?, ?)`, [setlistId, partTitle]);
            const newPart = { part_id: result.lastInsertRowId, setlist_id: setlistId, title: partTitle, song_id: null, };
            setProgramParts(prev => [...prev, newPart]);
            Alert.alert('Success', `Program Part "${partTitle}" added!`);
        } catch (error) {
            console.error('Insert Program Part error:', error);
            Alert.alert('Error', 'Failed to create program part.');
        }
    };
    
    const handleDeletePart = async (partId) => {
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }

        try {
            await db.runAsync(`DELETE FROM ProgramPart WHERE part_id = ?`, [partId]);
            setProgramParts(prev => prev.filter(part => part.part_id !== partId));
            Alert.alert('Success', 'Program Part deleted successfully.');
        } catch (error) {
            console.error('Delete Program Part error:', error);
            Alert.alert('Error', 'Failed to delete program part.');
        }
    };

    const addVoiceMemo = async (setlistId, filePath) => {
        if (!db || !filePath || setlistId === null || setlistId === undefined) { 
            console.error('Add Voice Memo Error: DB, filePath, or setlistId missing.');
            return Alert.alert('Error', 'Cannot save memo. Check logs.');
        }

        try {
            const dateCreated = new Date().toISOString().split('T')[0];
            const result = await db.runAsync(
                `INSERT INTO VoiceMemo (setlist_id, file_path, date_recorded) VALUES (?, ?, ?)`,
                [setlistId, filePath, dateCreated]
            );
            
            const newMemo = { memo_id: result.lastInsertRowId, setlist_id: setlistId, file_path: filePath, date_recorded: dateCreated, };

            setVoiceMemos(prev => [...prev, newMemo]);
            return newMemo;
        } catch (error) {
            console.error('Insert VoiceMemo error:', error);
            Alert.alert('Error', 'Failed to save voice memo record.');
            return null;
        }
    };
    
    const deleteVoiceMemo = async (memoId) => {
        if (!db) return Alert.alert('Error', 'DB not initialized.');

        const memoToDelete = voiceMemos.find(memo => memo.memo_id === memoId);
        if (!memoToDelete) { console.warn('Memo not found locally (ID:', memoId, ').'); return; }

        // Optimistically update state
        setVoiceMemos(prev => prev.filter(memo => memo.memo_id !== memoId));
        Alert.alert('Success', 'Voice memo removed from list.');
        
        // 1. Delete file system entry
        try {
            if (memoToDelete.file_path) {
                const fileInfo = await FileSystem.getInfoAsync(memoToDelete.file_path); 
                if (fileInfo.exists) {
                     await FileSystem.deleteAsync(memoToDelete.file_path, { idempotent: true });
                }
            }
        } catch (fileError) {
            console.error('VoiceMemo File Deletion Failed:', fileError);
        }

        // 2. Delete database entry
        try {
            await db.runAsync(`DELETE FROM VoiceMemo WHERE memo_id = ?`, [memoId]);
        } catch (dbError) {
            console.error('VoiceMemo DB Deletion Failed:', dbError);
        }
    };

    const updateSongForPart = async (partId, songId) => {
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }
        
        const finalSongId = songId === undefined ? null : songId;

        try {
            await db.runAsync(`UPDATE ProgramPart SET song_id = ? WHERE part_id = ?`, [finalSongId, partId]);
            
            setProgramParts(prevParts => 
                prevParts.map(part => part.part_id === partId ? { ...part, song_id: finalSongId } : part)
            );

            const songTitle = songs.find(s => s.song_id === finalSongId)?.title || 'No Song';
            Alert.alert('Success', `Part ${partId} linked to: ${songTitle}`);

        } catch (error) {
            console.error('Update Program Part error:', error);
            Alert.alert('Error', 'Failed to link song to program part.');
        }
    };


    const handleSetlistPress = (setlist) => {
        setCurrentSetlist(setlist);
        setIsCollapsed(true);
    };
    
    const handleHomePress = () => {
        setCurrentSetlist(null); 
        setIsCollapsed(true); 
        setAllSongsScreenVisible(false);
    };
    
    const openSetlistFormModal = () => {
        setIsCollapsed(true);
        setSetlistFormModalVisible(true);
    };
    
    const openAllSongsScreen = () => {
        setIsCollapsed(true);
        setAllSongsScreenVisible(true);
    };
    
    const openPictureScreen = () => {
        setIsCollapsed(true);
        setPictureScreenVisible(true);
    };
    
    const handleSongPress = (song) => {
        setSelectedSong(song);
        setModalVisible(true);
    };
    
    const handleViewSongDetails = (songId) => {
        const song = songs.find(s => s.song_id === songId);
        if (song) {
            handleSongPress(song);
        } else {
            Alert.alert('Error', 'Song details not found.');
        }
    };

    const renderSetlistItem = ({ item }) => (
        <Pressable style={styles.setlistItemCard} onPress={() => handleSetlistPress(item)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDetail}>Created on: {item.date_created}</Text>  
            {/* The item.setlistDescription property may not exist if you only store 'description' */}
            <Text style={styles.cardDetail}>{item.description}</Text> 
     </Pressable>
    );
    
    if (!db) {
        return <Text style={styles.loadingText}>Loading database...</Text>;
    }
    
    if (pictureScreenVisible) {
        return <AddPictureScreen onClose={() => setPictureScreenVisible(false)} />;
    }
    
    if (allSongsScreenVisible) {
        return (
            <AllSongsScreen 
                songs={songs} 
                onSongPress={(song) => {
                    setAllSongsScreenVisible(false);
                    handleSongPress(song);
                }}
                onClose={handleHomePress} 
            />
        );
    }


    return (
        <View style={styles.container}>
            
            {currentSetlist ? (
                <SetlistDetailScreen
                    currentSetlist={currentSetlist}
                    programParts={programParts.filter(p => p.setlist_id === currentSetlist.setlist_id)}
                    songLibrary={songs} 
                    handleHomePress={handleHomePress}
                    addProgramPart={addProgramPart} 
                    handleDeletePart={handleDeletePart} 
                    voiceMemos={voiceMemos.filter(m => m.setlist_id === currentSetlist.setlist_id)}
                    addVoiceMemo={addVoiceMemo}
                    deleteVoiceMemo={deleteVoiceMemo} 
                    updateSongForPart={updateSongForPart} 
                    handleViewSongDetails={handleViewSongDetails}
                    deleteSetlist={deleteSetlist} 
                />
            ) : (
                
                <View style={styles.homeScreenWrapper}>
                    <ScrollView contentContainerStyle={styles.scrollContent}> 
                        <Text style={styles.heading}>Worship Flow</Text>
                        <View style={styles.separator} />
                        <Text style={[styles.cardDetail, {marginLeft: '5%', marginBottom: 15}]}>
                            Tap a Setlist to view the program details.
                        </Text>

                        <View key={`setlist-list-wrapper-${renderKey}`} style={styles.listWrapper}>
                            <FlatList
                                data={setlists}
                                renderItem={renderSetlistItem}
                                keyExtractor={item => item.setlist_id.toString()}
                                style={styles.list}
                                scrollEnabled={false} 
                                ListEmptyComponent={<Text style={styles.emptyList}>No setlists saved. Tap '+' to create one.</Text>}
                            />
                        </View>
                        <View style={styles.miniSeparator} />
                        
                    </ScrollView>

                    <View style={styles.fabContainer}>
                        {!isCollapsed && (
                            <Pressable style={styles.fabOption} onPress={openSetlistFormModal}>
                                <Text style={styles.fabText}>Create Setlist</Text>
                            </Pressable>
                        )}
                        {!isCollapsed && (
                            <Pressable 
                                style={styles.fabOption} 
                                onPress={() => {
                                    setIsCollapsed(true);
                                    setSongFormModalVisible(true); 
                                }}
                            >
                                <Text style={styles.fabText}>Add New Song</Text>
                            </Pressable>
                        )}
                        {!isCollapsed && (
                            <Pressable style={styles.fabOption} onPress={openAllSongsScreen}>
                                <Text style={styles.fabText}>View All Songs</Text>
                            </Pressable>
                        )}
                            {!isCollapsed && (
                            <Pressable style={styles.fabOption} onPress={openPictureScreen}>
                                <Text style={styles.fabText}>Practice Resources</Text>
                            </Pressable>
                        )}
                        <TouchableOpacity
                            style={styles.fabMain}
                            onPress={() => setIsCollapsed(!isCollapsed)}
                        >
                            <Text style={styles.fabMainText}>{isCollapsed ? '+' : 'x'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Modal
                animationType="slide"
                transparent={false}
                visible={setlistFormModalVisible}
                onRequestClose={() => setSetlistFormModalVisible(false)}
            >
                <View style={styles.formModalView}>
                    <Text style={styles.formHeading}>Create New Setlist</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Setlist Name (Required)" 
                        value={setlistName} 
                        onChangeText={setSetlistName} 
                    />
                    <TextInput
                        style={[styles.input, styles.multilineSmall]}
                        placeholder="Description (Optional)"
                        value={setlistDescription}
                        onChangeText={setSetlistDescription}
                        multiline
                    />
                    <Button title="Save Setlist" onPress={addSetlist} color="#2196F3" />

                    <TouchableOpacity
                        style={[styles.closeButton, {maxHeight: 40, marginTop: 20, backgroundColor: '#ff2600ff' }]}
                        onPress={() => setSetlistFormModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={false}
                visible={songFormModalVisible}
                onRequestClose={() => setSongFormModalVisible(false)}
            >
                <View style={styles.formModalView}>
                    <Text style={styles.formHeading}>Add New Song</Text>
                    <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
                    <TextInput style={styles.input} placeholder="Artist" value={artist} onChangeText={setArtist} />
                    <TextInput style={styles.input} placeholder="Key" value={key} onChangeText={setKey} />
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        placeholder="Lyrics"
                        value={lyrics}
                        onChangeText={setLyrics}
                        multiline
                    />
                    <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
                    <TextInput style={styles.input} placeholder="Type" value={type} onChangeText={setType} />
                    <Button title="Save Song" onPress={addSong} />

                    <TouchableOpacity
                        style={[styles.closeButton, {maxHeight: 50, marginTop: 20, backgroundColor: '#FF6347' }]}
                        onPress={() => setSongFormModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                {selectedSong && (
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{selectedSong.title}</Text>
                        <Text style={styles.modalArtist}>by {selectedSong.artist}</Text>
                        <Text style={styles.modalKey}>Key: {selectedSong.key || 'N/A'}</Text>
                        <View style={styles.separator} />
                        
                        <ScrollView style={styles.modalLyricsScroll}>
                            <Text style={styles.modalLyricsText}>
                                {selectedSong.lyrics || 'No lyrics available for this song.'}
                            </Text>
                        </ScrollView>

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={[styles.closeButton, styles.closeModalButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f5f5f5', 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    },
    homeScreenWrapper: { 
        flex: 1, 
        width: '100%' 
    }, 
    scrollContent: { 
        alignItems: 'center', 
        paddingTop: 10, 
        paddingBottom: 120, 
    },
    heading: { 
        fontSize: 36, 
        fontWeight: 'bold', 
        marginBottom: 10, 
        marginTop: 30, 
        textAlign: 'left', 
        width: '90%', 
        alignSelf: 'center', 
        color: '#333', 
    },
    formHeading: { 
        fontSize: 22, 
        fontWeight: '600', 
        marginBottom: 15, 
        color: '#1a1a1a', 
    },
    
    setlistTitle: { 
        fontSize: 28, 
        fontWeight: '800', 
        color: '#1a73e8', 
        marginTop: 25, 
        marginBottom: 5, 
        alignSelf: 'flex-start', 
        marginLeft: '5%', 
    },
    cardDetail: { 
        fontSize: 14, 
        color: '#777',
    },
    input: { 
        backgroundColor: '#f9f9f9', 
        borderColor: '#ddd', 
        borderWidth: 1, 
        marginBottom: 12, 
        padding: 12, 
        borderRadius: 6, 
        width: '100%', 
        fontSize: 16, 
    },
    multiline: { 
        height: 100, 
        textAlignVertical: 'top', 
    },
    multilineSmall: { 
        height: 70, 
        textAlignVertical: 'top', 
    },
    loadingText: { 
        flex: 1, 
        textAlign: 'center', 
        marginTop: 50, 
        fontSize: 18, 
    },
    separator: { 
        height: 1, 
        backgroundColor: '#ccc', 
        width: '100%', 
        marginVertical: 20, 
    }, 
    miniSeparator: { 
        height: 1, 
        backgroundColor: '#eee', 
        width: '90%', 
        marginVertical: 10, 
    },
    listWrapper: { 
        width: '95%', 
    }, 
    list: { 
        width: '100%', 
        marginBottom: 10, 
    },
    listContent: { 
        paddingHorizontal: 5, 
        paddingBottom: 20 
    },

    setlistItemCard: { 
        backgroundColor: '#fff', 
        padding: 18, 
        marginVertical: 6, 
        borderRadius: 10, 
        borderLeftWidth: 5, 
        borderLeftColor: '#4CAF50', 
        width: '100%', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 3.84, 
        elevation: 3, 
    },
    cardTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#333',
        marginBottom: 4,
    },
    emptyList: { 
        textAlign: 'center', 
        marginTop: 10, 
        fontSize: 14, 
        color: '#999', 
    },

    modalView: { 
        flex: 1, 
        padding: 20, 
        paddingTop: 50, 
        backgroundColor: '#fff', 
    },
    modalTitle: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: '#333', 
        marginBottom: 5, 
    },
    modalArtist: { 
        fontSize: 18, 
        color: '#666', 
        marginBottom: 10, 
    },
    modalKey: { 
        fontSize: 16, 
        color: '#4CAF50', 
        fontWeight: '600', 
    },
    modalLyricsScroll: { 
        flex: 1, 
        marginVertical: 20,
    },
    modalLyricsText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
    modalButtonRow: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 10, 
        gap: 10
    },
    closeButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1, 
    },
    deleteButton: {
        backgroundColor: '#FF6347', 
    },
    closeModalButton: {
        backgroundColor: '#2196F3',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    formModalView: {
        flex: 1,
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#f5f5f5',
    },
    
    fabContainer: {
        position: 'absolute',
        bottom: 60,
        right: 30,
        alignItems: 'flex-end',
    },
    fabOption: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        
    },
    fabText: {
        color: '#333',
        fontWeight: '600',
        fontSize: 16,
        paddingHorizontal: 5,
    },
    fabMain: {
        backgroundColor: '#FF9800',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    fabMainText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    allSongsContainer: {
        flex: 1,
        padding: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 50,
        backgroundColor: '#f5f5f5',
    },
    allSongsHeading: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    scrollContainer: { 
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    pictureScreenContainer: { 
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        minHeight: '100%', 
        paddingBottom: 50, 
    },
    pictureScreenHeading: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    // 🛑 CRITICAL FIX: The style object was incomplete.
    pictureScreenSubText: {
        fontSize: 16, // Assuming a standard text size
        lineHeight: 24, // Assuming a readable line height
        color: '#444', // Assuming a dark text color
        textAlign: 'left',
        width: '100%',
        paddingHorizontal: 10,
    },
    // You'll need to define a style for the Image if you uncomment it in AddPictureScreen
    resourceImage: {
        width: '100%', // Adjust as needed
        height: 250, // Adjust as needed
        resizeMode: 'contain',
        marginVertical: 20,
    }
});