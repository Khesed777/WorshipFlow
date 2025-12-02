import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, Pressable, TextInput, 
    Button, Alert, FlatList, Modal, TouchableOpacity 
} from 'react-native';
import { Audio } from 'expo-av'; 
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'; 

// Define default directory for recordings
const RECORDING_DIR = FileSystem.documentDirectory + 'voiceMemos/';

// Helper to get the full song object by ID
const getSong = (songId, songLibrary) => {
    if (!songId) return null;
    return songLibrary.find(s => s.song_id === songId);
};

// --- Link Song Modal Component (CLEANER VERSION) ---
const LinkSongModal = ({ visible, songLibrary, onClose, onSelectSong, currentPartId }) => {
    const [searchText, setSearchText] = useState('');
    
    // Enhanced: Search all song fields (title, artist, key, lyrics, category, type, etc.)
    const filterSong = (song, text) => {
        if (!text) return true;
        const lower = text.toLowerCase();
        return (
            (song.title && song.title.toLowerCase().includes(lower)) ||
            (song.artist && song.artist.toLowerCase().includes(lower)) ||
            (song.key && song.key.toLowerCase().includes(lower)) ||
            (song.lyrics && song.lyrics.toLowerCase().includes(lower)) ||
            (song.category && song.category.toLowerCase().includes(lower)) ||
            (song.type && song.type.toLowerCase().includes(lower))
        );
    };

    const filteredSongs = songLibrary
        .filter(song => filterSong(song, searchText))
        .sort((a, b) => a.title.localeCompare(b.title));

    const renderSongOption = ({ item }) => (
        <Pressable 
            style={modalStyles.songOption} 
            onPress={() => onSelectSong(currentPartId, item.song_id)}
        >
            <Feather name="plus-circle" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
                <Text style={modalStyles.songTitle}>{item.title}</Text>
                <Text style={modalStyles.songArtist}>— {item.artist} ({item.key})</Text>
            </View>
        </Pressable>
    );

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={modalStyles.container}>
                <View style={modalStyles.headerContainer}>
                    <Text style={modalStyles.header}>Link Song to Part</Text>
                    <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
                        <Feather name="x" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <View style={modalStyles.searchBar}>
                    <Feather name="search" size={20} color="#999" style={{ marginRight: 8 }} />
                    <TextInput
                        style={modalStyles.searchInput}
                        placeholder="Search by title, artist, key, lyrics, etc..."
                        value={searchText}
                        onChangeText={setSearchText}
                        autoFocus={true}
                    />
                </View>

                {filteredSongs.length === 0 ? (
                    <Text style={modalStyles.emptyText}>No matching songs found.</Text>
                ) : (
                    <FlatList
                        data={filteredSongs}
                        renderItem={renderSongOption}
                        keyExtractor={item => item.song_id.toString()}
                        style={modalStyles.list}
                    />
                )}
                
                <View style={modalStyles.buttonContainer}>
                    <TouchableOpacity 
                        style={modalStyles.unlinkButton} 
                        onPress={() => {
                            onSelectSong(currentPartId, null);
                            onClose();
                        }}
                    >
                         <Feather name="slash" size={18} color="white" style={{ marginRight: 5 }} />
                         <Text style={modalStyles.unlinkButtonText}>Unlink Song</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
// --- End Cleaner Link Song Modal Component ---

// --- NEW Add Part Modal Component ---
const AddPartModal = ({ visible, onClose, onAddPart }) => {
    const [title, setTitle] = useState('');

    const handleAdd = () => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Part title cannot be empty.');
            return;
        }
        onAddPart(title.trim());
        setTitle('');
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={fabStyles.modalOverlay} onPress={onClose}>
                <Pressable style={fabStyles.partModalView} onPress={(e) => e.stopPropagation()}>
                    <Text style={fabStyles.partModalTitle}>Add New Program Part</Text>
                    <TextInput
                        style={fabStyles.partModalInput}
                        placeholder="Program Part Title (e.g., Set 1, Intermission)"
                        value={title}
                        onChangeText={setTitle}
                        autoFocus={true}
                        onSubmitEditing={handleAdd} // Allows hitting 'Enter' to submit
                    />
                    <Button title="Add Part" onPress={handleAdd} color="#1a73e8" />
                </Pressable>
            </Pressable>
        </Modal>
    );
};
// --- End New Add Part Modal Component ---


// --- Main SetlistDetailScreen Component ---
export default function SetlistDetailScreen({
    currentSetlist,
    programParts,
    voiceMemos, // <-- Used to check for existing memo
    songLibrary,
    handleHomePress,
    addProgramPart,
    handleDeletePart,
    addVoiceMemo, // <-- New prop to save the memo metadata
    deleteVoiceMemo, // <-- New prop to delete the memo metadata and file
    updateSongForPart,
    handleViewSongDetails,
    deleteSetlist, // <-- PROP USED BY HEADER DELETE BUTTON
}) {
    // --- New States for Voice Memo ---
    const [recording, setRecording] = useState(null);
    const [sound, setSound] = useState(null); // For playback
    // ----------------------------------
    
    // --- FAB States ---
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [addPartModalVisible, setAddPartModalVisible] = useState(false);
    // ------------------
    
    // No longer needed: const [newPartTitle, setNewPartTitle] = useState('');

    const [linkModalVisible, setLinkModalVisible] = useState(false);
    const [partToLink, setPartToLink] = useState(null);

    // Determines if a memo exists for this setlist (single memo constraint)
    const existingMemo = voiceMemos.length > 0 ? voiceMemos[0] : null;

    // --- Setlist Delete Handler (MODIFIED) ---
    const confirmAndDelete = () => {
        Alert.alert('Confirm Delete', `Are you sure you want to delete the setlist: "${currentSetlist.name}"? This action cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' }, 
            { 
                text: 'Delete', 
                onPress: () => {
                    deleteSetlist(currentSetlist.setlist_id); // CALLS THE DELETE PROP
                    handleHomePress(); // NAVIGATES AWAY AFTER DELETION
                }, 
                style: 'destructive' 
            }
        ]);
    };
    // ----------------------------

    // --- Audio Handlers (START) ---
    
    // Ensure the recordings directory exists
    const prepareRecordingDir = async () => {
        const dirInfo = await FileSystem.getInfoAsync(RECORDING_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(RECORDING_DIR, { intermediates: true });
        }
    };

    // Starts recording
    const startRecording = async () => {
        setIsFabMenuOpen(false); // Close menu on action
        
        // Prevent recording if a memo already exists
        if (existingMemo) {
             Alert.alert('Existing Memo', 'Please delete the current memo before recording a new one.', [
                 { text: 'OK' },
                 { text: 'Delete Existing', onPress: () => handleDeleteMemo(existingMemo.memo_id) },
             ]);
             return;
        }
        
        // Unload any existing sound object before recording
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
        }
        
        try {
            await prepareRecordingDir();
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording.');
        }
    };

    // Stops recording and saves the file/metadata
    const stopRecording = async () => {
        if (!recording) return;

        setRecording(undefined);
        await recording.stopAndUnloadAsync();
        // Reset audio mode
        await Audio.setAudioModeAsync({ allowsRecording: false });
        
        const uri = recording.getURI();
        if (!uri) return;

        const fileName = `memo_${Date.now()}.m4a`;
        const newFilePath = RECORDING_DIR + fileName;

        try {
            // 1. Move the temporary recording file to the permanent location
            await FileSystem.moveAsync({
                from: uri,
                to: newFilePath,
            });

            // 2. Save the memo metadata (file path) to the setlist state
            const result = await addVoiceMemo(currentSetlist.setlist_id, newFilePath);
            if (!result) {
                // Cleanup file if saving metadata fails
                await FileSystem.deleteAsync(newFilePath, { idempotent: true });
                Alert.alert('Save Error', 'Failed to save recording metadata.');
            } 
        } catch (moveError) {
            console.error('Error saving or moving recording:', moveError);
            Alert.alert('Save Error', 'Failed to save recording file.');
        }
    };

    // Toggles play/pause for the existing memo
    const togglePlayback = async () => {
        if (!existingMemo) return;
        const uri = existingMemo.file_path;

        if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
            return;
        }

        // If no sound object exists, create one and play
        try {
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: uri },
                { shouldPlay: true },
                // Set playback status listener
                (status) => {
                    if (status.didJustFinish) {
                        newSound.unloadAsync();
                        setSound(null);
                    }
                }
            );
            setSound(newSound);
            await newSound.playAsync();
        } catch (error) {
            console.error('Error playing sound:', error);
            Alert.alert('Playback Error', 'Failed to play voice memo.');
        }
    };
    
    // Deletes the memo file and metadata
    const handleDeleteMemo = (memoId) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this voice memo and its file?', [
            { text: 'Cancel', style: 'cancel' }, 
            { text: 'Delete', onPress: async () => {
                // Ensure playback is stopped before deleting the file
                if (sound) {
                    await sound.unloadAsync(); 
                    setSound(null);
                }
                await deleteVoiceMemo(memoId);
            }, style: 'destructive'}
        ]);
    }
    
    // --- Audio Handlers (END) ---

    // --- Program Part Handlers ---
    
    const handleAddPart = (title) => {
        addProgramPart(currentSetlist.setlist_id, title); 
    };

    const handleOpenLinkModal = (partId) => {
        setPartToLink(partId);
        setLinkModalVisible(true);
    };

    const handleSelectAndLinkSong = (partId, songId) => {
        updateSongForPart(partId, songId);
        setLinkModalVisible(false);
        setPartToLink(null);
    };
    
    // --- FAB Handlers ---
    const handleFabPress = () => {
        setIsFabMenuOpen(!isFabMenuOpen);
    };
    
    const handleAddPartFab = () => {
        setIsFabMenuOpen(false);
        setAddPartModalVisible(true);
    }
    
    const handleRecordMemoFab = () => {
        startRecording(); // This automatically closes the FAB menu inside startRecording
    }

    // --- Renderer Functions ---

    const renderProgramPartItem = ({ item }) => {
        const linkedSong = getSong(item.song_id, songLibrary);
        
        return (
            <View style={styles.partItem}>
                <View style={styles.partContent}>
                    <Text style={styles.partTitle}>{item.title}</Text>
                    
                    {linkedSong ? (
                        <View style={styles.linkedSongContainer}>
                            <Feather name="music" size={14} color="#4CAF50" />
                            <Text style={styles.songLinkedText} numberOfLines={1}>
                                <Text style={{ fontWeight: 'bold' }}>{linkedSong.title}</Text>
                                <Text style={{ color: '#666' }}> ({linkedSong.key})</Text>
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.linkedSongContainer}>
                            <Feather name="slash" size={14} color="#999" />
                            <Text style={styles.songUnlinkedText}>No Song Linked</Text>
                        </View>
                    )}
                </View>

                <View style={styles.partActions}>
                    {linkedSong && (
                        <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={() => {
                                // Determine the index of this part within the programParts array
                                const partIndex = programParts.findIndex(p => p.part_id === item.part_id);
                                // Pass the song id plus the parts list and index so App can enable modal navigation
                                handleViewSongDetails(linkedSong.song_id, programParts, partIndex);
                            }}
                        >
                            <Feather name="eye" size={20} color="#2196F3" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#FFFBE0' }]} 
                        onPress={() => handleOpenLinkModal(item.part_id)}
                    >
                        <Feather name="link" size={20} color="#FFC107" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, { marginLeft: 8, backgroundColor: '#FFEBEE' }]} 
                        onPress={() => Alert.alert('Confirm Delete', `Delete part: ${item.title}?`, [{text: 'Cancel'}, {text: 'Delete', onPress: () => handleDeletePart(item.part_id), style: 'destructive'}])}
                    >
                        <Feather name="trash-2" size={20} color="#FF6347" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Voice Memo Section Renderer ---
    const renderVoiceMemoSection = () => {
        // Check if the current sound object is playing the existing memo
        const isPlaying = sound && sound._loaded && existingMemo && sound._uri === existingMemo.file_path;
        
        // State 1: Currently Recording
        if (recording) {
            return (
                <View style={[styles.memoContainer, styles.recordingActive]}>
                    <MaterialIcons name="mic" size={20} color="#E53935" style={{marginRight: 10}} />
                    <Text style={styles.memoText}>**Recording...**</Text>
                    <TouchableOpacity
                        style={styles.memoStopButton}
                        onPress={stopRecording} // STOP function
                    >
                        <Feather name="square" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            );
        }

        // State 2: Memo Exists (Show Play/Delete)
        if (existingMemo) {
            const date = new Date(existingMemo.date_recorded);
            // Format time for display
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
                <View style={[styles.memoContainer, styles.memoExists]}>
                    <MaterialIcons name="headset" size={20} color="#4CAF50" style={{marginRight: 10}} />
                    <Text style={styles.memoText}>Setlist Voice Memo</Text>
                    <View style={styles.memoActions}>
                        <TouchableOpacity
                            style={styles.memoPlayButton}
                            onPress={togglePlayback} // Play/Pause function
                        >
                            <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.memoDeleteButton}
                            onPress={() => handleDeleteMemo(existingMemo.memo_id)}
                        >
                            <Feather name="trash-2" size={18} color="#E53935" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }
        
        return (
            <View style={[styles.memoContainer, styles.memoEmpty]}>
                <Feather name="mic-off" size={18} color="#999" style={{ marginRight: 10 }}/>
                <Text style={styles.memoText}>No Voice Memo Saved</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={handleHomePress} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#1a73e8" />
                </Pressable>
                
                <Text style={styles.heading} numberOfLines={1}>{currentSetlist.name}</Text>
                
                {/* --- DELETE BUTTON (Now correctly wired to confirmAndDelete) --- */}
                <Pressable onPress={confirmAndDelete} style={styles.deleteHeaderButton}>
                    <Feather name="trash-2" size={20} color="white" />
                </Pressable>
            </View>
            
            {/* --- SETLIST DETAILS (Scrollable Content) --- */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.description}>
                     {currentSetlist.description || 'No description provided.'}
                </Text>
                <Text style={styles.date}>Created: {currentSetlist.date_created}</Text>
                
                {/* --- 1. VOICE MEMO SECTION (Dynamic UI) --- */}
                <Text style={styles.sectionHeader}>Setlist Memo</Text>
                {renderVoiceMemoSection()}

                {/* --- 2. Program Parts List --- */}
                <Text style={[styles.sectionHeader, {marginTop: 20}]}>Program Parts</Text>
                <FlatList
                    data={programParts}
                    renderItem={renderProgramPartItem}
                    keyExtractor={item => item.part_id.toString()}
                    style={styles.list}
                    scrollEnabled={false}
                    ListEmptyComponent={<Text style={styles.emptyList}>No parts added yet. Use the FAB to add a part.</Text>}
                />
                
            </ScrollView>
            
            {/* --- FLOATING ACTION BUTTON (FAB) --- */}
            <View style={fabStyles.fabContainer}>
                {isFabMenuOpen && (
                    <View>
                        {/* Option 1: Record New Memo (Only visible if no memo exists) */}
                        {!existingMemo && !recording && (
                            <TouchableOpacity 
                                style={[fabStyles.fabAction, { backgroundColor: '#FF9800' }]} 
                                onPress={handleRecordMemoFab}
                            >
                                <Text style={fabStyles.fabActionText}>Record Memo</Text>
                                <Feather name="mic" size={20} color="white" />
                            </TouchableOpacity>
                        )}

                        {/* Option 2: Add Program Part */}
                        <TouchableOpacity style={fabStyles.fabAction} onPress={handleAddPartFab}>
                            <Text style={fabStyles.fabActionText}>Add Part</Text>
                            <Feather name="plus-square" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
                
                {/* Main FAB button */}
                <TouchableOpacity
                    style={fabStyles.mainFab}
                    onPress={handleFabPress}
                >
                    <MaterialIcons 
                        name={isFabMenuOpen ? "close" : "add"} 
                        size={28} 
                        color="white" 
                    />
                </TouchableOpacity>
            </View>
            
            {/* --- Modals --- */}
            <LinkSongModal
                visible={linkModalVisible}
                songLibrary={songLibrary}
                onClose={() => setLinkModalVisible(false)}
                onSelectSong={handleSelectAndLinkSong}
                currentPartId={partToLink}
            />
            
            <AddPartModal 
                visible={addPartModalVisible}
                onClose={() => setAddPartModalVisible(false)}
                onAddPart={handleAddPart}
            />
        </View>
    );
}

// --- Styles for SetlistDetailScreen (Main/Program Part Styles) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', padding: 10 },
    scrollView: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5 },
    backButton: { marginRight: 10, padding: 5 },
    heading: { flex: 1, fontSize: 26, fontWeight: 'bold', color: '#2196F3', letterSpacing: 1 },
    deleteHeaderButton: {
        marginLeft: 10,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#7bb6f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2196F3',
        marginTop: 15,
        paddingHorizontal: 10,
        textAlign: 'right',
        letterSpacing: 0.5,
    },
    description: { fontSize: 16, color: '#444', paddingHorizontal: 10, marginTop: 5, lineHeight: 22 },
    date: { fontSize: 14, color: '#7bb6f7', paddingHorizontal: 10, marginBottom: 15 },
    scrollContent: { paddingBottom: 100 },
    list: { width: '100%' },
    emptyList: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#b0b0b0', paddingBottom: 20 },
    // Minimal program part card
    partItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f7fbff',
        padding: 16,
        marginVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e3f0fa',
        shadowColor: 'transparent',
        elevation: 0,
    },
    partContent: { flex: 1, marginRight: 10 },
    partTitle: { fontSize: 18, fontWeight: '600', color: '#2196F3', marginBottom: 5, letterSpacing: 0.5 },
    linkedSongContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    songLinkedText: { flex: 1, fontSize: 15, color: '#2196F3', fontWeight: '500', marginLeft: 8 },
    songUnlinkedText: { flex: 1, fontSize: 15, color: '#b0b0b0', fontStyle: 'italic', marginLeft: 8 },
    partActions: { flexDirection: 'row', alignItems: 'center' },
    actionButton: { padding: 8, borderRadius: 8, marginLeft: 8, backgroundColor: '#e3f0fa' },
    // --- VOICE MEMO STYLES ---
    memoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginHorizontal: 10,
        marginTop: 10,
        borderWidth: 1,
        backgroundColor: '#f7fbff',
        borderColor: '#e3f0fa',
    },
    memoText: {
        fontSize: 16,
        flex: 1,
        fontWeight: '500',
        color: '#2196F3',
    },
    recordingActive: {
        backgroundColor: '#e3f0fa',
        borderColor: '#2196F3',
    },
    memoStopButton: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 8,
    },
    memoExists: {
        backgroundColor: '#e3f0fa',
        borderColor: '#2196F3',
    },
    memoActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memoPlayButton: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 8,
        marginRight: 10,
    },
    memoDeleteButton: {
        backgroundColor: '#e3f0fa',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#b0b0b0',
    },
    memoEmpty: {
        backgroundColor: '#f7fbff',
        borderColor: '#e3f0fa',
        justifyContent: 'flex-start',
    },
    // --- Song Modal Header Styles (Minimal) ---
    songModalHeader: {
        backgroundColor: '#e3f0fa',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        marginHorizontal: -20,
        marginTop: -50,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e3f0fa',
        elevation: 0,
        shadowColor: 'transparent',
    },
    songModalPartName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#2196F3',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    songModalSongTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
    },
});

// --- FAB and Add Part Modal Styles (Unchanged from original, but included for completeness) ---
const fabStyles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        bottom: 60,
        right: 30,
        alignItems: 'flex-end',
        zIndex: 10,
    },
    mainFab: {
        backgroundColor: '#1a73e8',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    fabAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a73e8', 
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 25,
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    fabActionText: {
        color: 'white',
        fontWeight: 'bold',
        marginRight: 10,
        fontSize: 16,
    },
    
    // Part Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    partModalView: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        elevation: 10,
    },
    partModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#1a73e8',
    },
    partModalInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        fontSize: 16,
    }
});

// --- CLEANER Link Song Modal Styles (UPDATED) ---
const modalStyles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#f5f5f5', },
    headerContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 15,
    },
    header: { fontSize: 26, fontWeight: 'bold', color: '#1a73e8', },
    closeButton: {
        padding: 5,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    list: { flex: 1, },
    songOption: { 
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff', 
        padding: 15, 
        marginVertical: 4, 
        borderRadius: 8, 
        borderLeftWidth: 4, 
        borderLeftColor: '#4CAF50', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 1.41, 
        elevation: 2,
    },
    songTitle: { fontSize: 18, fontWeight: '600', color: '#333' }, // Bolder title
    songArtist: { fontSize: 14, color: '#666', marginTop: 2 }, // Clearer separation
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999', },
    buttonContainer: { 
        paddingVertical: 15, 
        borderTopWidth: 1, 
        borderTopColor: '#eee', 
        alignItems: 'center' 
    },
    unlinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6347',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#FF6347', 
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    unlinkButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});