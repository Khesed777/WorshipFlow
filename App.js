import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, TextInput, Button, Text, StyleSheet, Alert, 
    ScrollView, FlatList, Pressable, Modal, TouchableOpacity, 
    Platform, StatusBar, Image, BackHandler 
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { initDB } from './src/database'; 
import SetlistDetailScreen from './src/SetlistDetailScreen'; 
import Metronome from './Metronome';

// --- Component: AllSongsScreen ---
const AllSongsScreen = ({ songs, onSongPress, onClose }) => {
    const [search, setSearch] = useState("");
    // Comprehensive search across all fields
    const filteredSongs = songs.filter(song => {
        const q = search.toLowerCase();
        return (
            song.title?.toLowerCase().includes(q) ||
            song.artist?.toLowerCase().includes(q) ||
            song.key?.toLowerCase().includes(q) ||
            song.lyrics?.toLowerCase().includes(q) ||
            song.category?.toLowerCase().includes(q) ||
            song.type?.toLowerCase().includes(q)
        );
    });

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
            <Text style={styles.allSongsHeading}>All Saved Songs ({filteredSongs.length})</Text>
            <TextInput
                style={[styles.input, {marginBottom: 10, borderColor: '#b3c6e6', backgroundColor: '#e3f0fa'}]}
                placeholder="Search by title, artist, key, lyrics, etc."
                placeholderTextColor="#7bb6f7"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
            />
            <View style={styles.separator} />
            <FlatList
                data={filteredSongs}
                renderItem={renderSongItem}
                keyExtractor={item => item.song_id.toString()}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyList}>No songs found. Try a different search!</Text>}
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
    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7fbff', padding: 24 }} style={{ backgroundColor: '#f7fbff' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2196F3', marginBottom: 6, letterSpacing: 1, marginTop: 20 }}>Practice Resources</Text>
            <Text style={{ color: '#7bb6f7', fontSize: 15, marginBottom: 18, textAlign: 'center', maxWidth: 320 }}>
                Tools to help your worship team prepare and flow smoothly.
            </Text>
            <View style={{ width: '100%', alignItems: 'center', backgroundColor: '#e3f0fa', borderRadius: 18, padding: 18, marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#2196F3', marginBottom: 10 }}>Metronome</Text>
                <Metronome />
            </View>
            <View style={{ width: '100%', backgroundColor: '#e3f0fa', borderRadius: 18, padding: 0, marginBottom: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <ScrollView horizontal={false} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }} style={{ width: '100%' }}>
                    <Image
                        source={require('./assets/myImage.jpg')}
                        style={{ width: '100%', height: undefined, aspectRatio: 3/4, maxHeight: 500, resizeMode: 'contain', borderRadius: 12, backgroundColor: '#f7fbff' }}
                    />
                </ScrollView>
            </View>
            <TouchableOpacity
                style={{ backgroundColor: '#2196F3', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginTop: 10, marginBottom: 10 }}
                onPress={onClose}
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Return to Home</Text>
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
    const [modalProgramParts, setModalProgramParts] = useState([]); // parts passed when opening modal
    const [modalCurrentPartIndex, setModalCurrentPartIndex] = useState(null);
    
    const [isCollapsed, setIsCollapsed] = useState(true);

    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [key, setKey] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [category, setCategory] = useState('');
    const [type, setType] = useState('');
    const [setlistName, setSetlistName] = useState('');
    const [setlistDescription, setSetlistDescription] = useState('');

    const [sortOldestFirst, setSortOldestFirst] = useState(false);
    const [lyricsFontSize, setLyricsFontSize] = useState(16);

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

    // --- Android Back Button Handling ---
    useEffect(() => {
        const onBackPress = () => {
            // If any modal or submenu is open, close it and do not exit app
            if (modalVisible) {
                setModalVisible(false);
                return true;
            }
            if (songFormModalVisible) {
                setSongFormModalVisible(false);
                return true;
            }
            if (setlistFormModalVisible) {
                setSetlistFormModalVisible(false);
                return true;
            }
            if (pictureScreenVisible) {
                setPictureScreenVisible(false);
                return true;
            }
            if (allSongsScreenVisible) {
                setAllSongsScreenVisible(false);
                return true;
            }
            if (currentSetlist) {
                setCurrentSetlist(null);
                setIsCollapsed(true);
                return true;
            }
            // If on main menu, prompt before exiting
            Alert.alert(
                'Exit App',
                'Are you sure you want to exit?',
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => {} },
                    { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
                ]
            );
            return true; // Prevent default exit
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [modalVisible, songFormModalVisible, setlistFormModalVisible, pictureScreenVisible, allSongsScreenVisible, currentSetlist]);

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
    
    const handleViewSongDetails = (songId, partsList = null, partIndex = null) => {
        const song = songs.find(s => s.song_id === songId);
        if (song) {
            // If a parts list and index were provided, store them to enable "Next Part" navigation
            if (Array.isArray(partsList) && Number.isInteger(partIndex)) {
                setModalProgramParts(partsList);
                setModalCurrentPartIndex(partIndex);
            } else {
                setModalProgramParts([]);
                setModalCurrentPartIndex(null);
            }
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
        <View style={styles.minimalBg}>
            {/* Minimalist background shape */}
            <View style={styles.bgShape1} pointerEvents="none" />
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
                            <View style={styles.heroHeaderMinimal}>
                                <Text style={styles.headingMinimal}>Worship Flow</Text>
                                <Text style={styles.heroSubtextMinimal}>Your worship setlist manager</Text>
                            </View>
                            <Text style={[styles.cardDetail, styles.homeHintMinimal]}>Tap a Setlist to view</Text>
                            {/* Sort Toggle */}
                            <View style={{ width: '95%', alignItems: 'flex-end', marginBottom: 4 }}>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#e3f0fa', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 16, marginBottom: 2 }}
                                    onPress={() => setSortOldestFirst(v => !v)}
                                >
                                    <Text style={{ color: '#2196F3', fontWeight: '600', fontSize: 14 }}>
                                        {sortOldestFirst ? 'Sort: Oldest → Newest' : 'Sort: Newest → Oldest'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View key={`setlist-list-wrapper-${renderKey}`} style={styles.listWrapper}>
                                <FlatList
                                    data={[...setlists].sort((a, b) => sortOldestFirst ? new Date(a.date_created) - new Date(b.date_created) : new Date(b.date_created) - new Date(a.date_created))}
                                    renderItem={({ item }) => (
                                        <View style={styles.setlistCardMinimal}>
                                            {renderSetlistItem({ item })}
                                        </View>
                                    )}
                                    keyExtractor={item => item.setlist_id.toString()}
                                    style={styles.list}
                                    scrollEnabled={false}
                                    ListEmptyComponent={<Text style={styles.emptyList}>No setlists saved. Tap '+' to create one.</Text>}
                                />
                            </View>
                        </ScrollView>
                        <View style={styles.fabContainer}>
                            {/* App Info FAB (inside collapsible FAB menu) */}
                            {!isCollapsed && (
                                <Pressable
                                    style={[styles.fabOptionMinimal, { backgroundColor: '#e3f0fa', flexDirection: 'row', alignItems: 'center' }]}
                                    onPress={() => {
                                        Alert.alert(
                                            'App Information',
                                            'Prepared by: Team JJJM (Group 1)\nJainie M. Eking\nJohari Gandawali\nMickey Nadayag\nJade B. Ramos\n\nUniversity of Science and Technology of Southern Philippines\nMain Campus - Alubijid\n\nPassed for Software Engineering Project\n2025',
                                            [
                                                { text: 'OK', style: 'default' }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={{ color: '#2196F3', fontWeight: 'bold', fontSize: 18, marginRight: 8 }}>i</Text>
                                    <Text style={{ color: '#2196F3', fontWeight: '600', fontSize: 15 }}>App Info</Text>
                                </Pressable>
                            )}
                            {!isCollapsed && (
                                <Pressable style={[styles.fabOptionMinimal]} onPress={openSetlistFormModal}>
                                    <Text style={styles.fabTextMinimal}>Create Setlist</Text>
                                </Pressable>
                            )}
                            {!isCollapsed && (
                                <Pressable
                                    style={[styles.fabOptionMinimal]}
                                    onPress={() => {
                                        setIsCollapsed(true);
                                        setSongFormModalVisible(true);
                                    }}
                                >
                                    <Text style={styles.fabTextMinimal}>Add New Song</Text>
                                </Pressable>
                            )}
                            {!isCollapsed && (
                                <Pressable style={[styles.fabOptionMinimal]} onPress={openAllSongsScreen}>
                                    <Text style={styles.fabTextMinimal}>View All Songs</Text>
                                </Pressable>
                            )}
                            {!isCollapsed && (
                                <Pressable style={[styles.fabOptionMinimal]} onPress={openPictureScreen}>
                                    <Text style={styles.fabTextMinimal}>Practice Resources</Text>
                                </Pressable>
                            )}
                            <TouchableOpacity
                                style={styles.fabMainMinimal}
                                onPress={() => setIsCollapsed(!isCollapsed)}
                            >
                                <Text style={styles.fabMainTextMinimal}>{isCollapsed ? '+' : 'x'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={setlistFormModalVisible}
                onRequestClose={() => setSetlistFormModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(33,150,243,0.08)' }}>
                    <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', shadowColor: '#2196F3', shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#2196F3', marginBottom: 18, letterSpacing: 1 }}>Create New Setlist</Text>
                        <TextInput 
                            style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 18, marginBottom: 14 }]} 
                            placeholder="Setlist Name (Required)" 
                            placeholderTextColor="#7bb6f7"
                            value={setlistName} 
                            onChangeText={setSetlistName} 
                            autoFocus={true}
                        />
                        <TextInput
                            style={[styles.input, styles.multilineSmall, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16 }]} 
                            placeholder="Description (Optional)"
                            placeholderTextColor="#7bb6f7"
                            value={setlistDescription}
                            onChangeText={setSetlistDescription}
                            multiline
                        />
                        <TouchableOpacity
                            style={{ backgroundColor: '#2196F3', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' }}
                            onPress={addSetlist}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>Save Setlist</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: '#e3f0fa', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 12, width: '100%', alignItems: 'center' }}
                            onPress={() => setSetlistFormModalVisible(false)}
                        >
                            <Text style={{ color: '#2196F3', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
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
                        {/* Fixed Header: Program Part + Song Title + Font Size Controls */}
                        <View style={styles.songModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    {modalProgramParts && modalProgramParts.length > 0 && modalCurrentPartIndex !== null && modalCurrentPartIndex >= 0 ? (
                                        <>
                                            <Text style={styles.songModalPartName}>
                                                {modalProgramParts[modalCurrentPartIndex]?.title || 'Program Part'}
                                            </Text>
                                            <Text style={styles.songModalSongTitle}>
                                                {selectedSong.title}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={styles.songModalSongTitle}>{selectedSong.title}</Text>
                                    )}
                                </View>
                                {/* Font size controls */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                    <TouchableOpacity
                                        style={{ padding: 6, borderRadius: 8, backgroundColor: '#e3f0fa', marginRight: 4 }}
                                        onPress={() => setLyricsFontSize(f => Math.max(12, f - 2))}
                                    >
                                        <Text style={{ fontSize: 18, color: '#2196F3', fontWeight: 'bold' }}>-</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ padding: 6, borderRadius: 8, backgroundColor: '#e3f0fa' }}
                                        onPress={() => setLyricsFontSize(f => Math.min(36, f + 2))}
                                    >
                                        <Text style={{ fontSize: 18, color: '#2196F3', fontWeight: 'bold' }}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.modalArtist}>by {selectedSong.artist}</Text>
                        <Text style={styles.modalKey}>Key: {selectedSong.key || 'N/A'}</Text>
                        <View style={styles.separator} />
                        {/* Scrollable Lyrics and Navigation Buttons at Bottom */}
                        <ScrollView style={styles.modalLyricsScroll} contentContainerStyle={{flexGrow: 1, justifyContent: 'space-between'}}>
                            <Text style={[styles.modalLyricsText, { fontSize: lyricsFontSize }]}>
                                {selectedSong.lyrics || 'No lyrics available for this song.'}
                            </Text>
                            {/* Navigation Buttons Row (at bottom, scrolls with lyrics) */}
                            <View style={styles.modalButtonRow}>
                                {/* Previous Part Button (left) */}
                                {modalProgramParts && modalProgramParts.length > 0 && modalCurrentPartIndex !== null && modalCurrentPartIndex > 0 ? (() => {
                                    let prevIdx = null;
                                    for (let i = modalCurrentPartIndex - 1; i >= 0; i--) {
                                        const part = modalProgramParts[i];
                                        if (part && part.song_id) { prevIdx = i; break; }
                                    }
                                    if (prevIdx !== null) {
                                        const prevPart = modalProgramParts[prevIdx];
                                        const prevSong = songs.find(s => s.song_id === prevPart.song_id);
                                        return (
                                            <TouchableOpacity
                                                style={[styles.modalActionButton, { backgroundColor: '#2196F3' }]}
                                                onPress={() => { setSelectedSong(prevSong); setModalCurrentPartIndex(prevIdx); }}
                                            >
                                                <Text style={styles.closeButtonText}>← Prev</Text>
                                                <Text style={{ color: 'white', fontSize: 12 }} numberOfLines={1}>{prevPart.title} • {prevSong?.title || 'Song'}</Text>
                                            </TouchableOpacity>
                                        );
                                    }
                                    return null;
                                })() : null}

                                {/* Center Close Button */}
                                <TouchableOpacity
                                    style={[styles.modalActionButton, styles.modalCloseAction]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>

                                {/* Next Part Button (right) */}
                                {modalProgramParts && modalProgramParts.length > 0 && modalCurrentPartIndex !== null && modalCurrentPartIndex < modalProgramParts.length - 1 ? (() => {
                                    let nextIdx = null;
                                    for (let i = modalCurrentPartIndex + 1; i < modalProgramParts.length; i++) {
                                        const part = modalProgramParts[i];
                                        if (part && part.song_id) { nextIdx = i; break; }
                                    }
                                    if (nextIdx !== null) {
                                        const nextPart = modalProgramParts[nextIdx];
                                        const nextSong = songs.find(s => s.song_id === nextPart.song_id);
                                        return (
                                            <TouchableOpacity
                                                style={[styles.modalActionButton, { backgroundColor: '#4CAF50' }]}
                                                onPress={() => { setSelectedSong(nextSong); setModalCurrentPartIndex(nextIdx); }}
                                            >
                                                <Text style={styles.closeButtonText}>Next →</Text>
                                                <Text style={{ color: 'white', fontSize: 12 }} numberOfLines={1}>{nextPart.title} • {nextSong?.title || 'Song'}</Text>
                                            </TouchableOpacity>
                                        );
                                    }
                                    return null;
                                })() : null}
                            </View>
                        </ScrollView>
                    </View>
                )}
            </Modal>
        </View>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    minimalBg: {
        flex: 1,
        backgroundColor: '#f7fbff',
        position: 'relative',
    },
    bgShape1: {
        position: 'absolute',
        top: -80,
        left: -100,
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: '#e3f0fa',
        opacity: 0.7,
        zIndex: 0,
    },
    container: { 
        flex: 1, 
        backgroundColor: 'transparent',
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
        fontSize: 38,
        fontWeight: 'bold',
        marginBottom: 0,
        marginTop: 0,
        textAlign: 'center',
        width: '100%',
        color: 'white',
        letterSpacing: 2,
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
        height: 2,
        backgroundColor: '#00BFFF',
        width: '90%',
        alignSelf: 'center',
        marginVertical: 20,
    }, 
    miniSeparator: { 
        height: 1,
        backgroundColor: '#FF9800',
        width: '80%',
        alignSelf: 'center',
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
        padding: 10,
        borderRadius: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 3.84,
        elevation: 5,
    },
    fabText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
        paddingHorizontal: 5,
        letterSpacing: 1,
    },
    fabMain: {
        backgroundColor: '#00BFFF',
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
    },
    // --- Song Modal Header Styles ---
    songModalHeader: {
        backgroundColor: '#e3eafc',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        paddingVertical: 18,
        paddingHorizontal: 16,
        alignItems: 'center',
        marginHorizontal: -20,
        marginTop: -50,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#b3c6e6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    songModalPartName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a73e8',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    songModalSongTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
    },
    modalActionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
    },
    modalCloseAction: {
        backgroundColor: '#2196F3',
        flex: 0.8,
    },
    heroHeaderMinimal: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 10,
        backgroundColor: 'transparent',
        marginBottom: 10,
        zIndex: 1,
    },
    headingMinimal: {
        fontSize: 60,
        fontWeight: '700',
        color: '#2196F3',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    heroSubtextMinimal: {
        color: '#7bb6f7',
        fontSize: 15,
        marginTop: 2,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    homeHintMinimal: {
        color: '#2196F3',
        fontWeight: '400',
        marginLeft: '5%',
        marginBottom: 15,
        fontSize: 14,
    },
    setlistCardMinimal: {
        backgroundColor: 'white',
        borderRadius: 18,
        marginVertical: 2, // Reduced gap
        marginHorizontal: 2,
        borderWidth: 1,
        borderColor: '#e3f0fa',
        padding: 0,
        shadowColor: 'transparent',
        elevation: 0,
    },
    fabOptionMinimal: {
        backgroundColor: '#2196F3',
        padding: 10,
        borderRadius: 16,
        marginBottom: 10,
        alignItems: 'center',
        minWidth: 120,
    },
    fabTextMinimal: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
        letterSpacing: 0.5,
    },
    fabMainMinimal: {
        backgroundColor: '#2196F3',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 4,
    },
    fabMainTextMinimal: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
});