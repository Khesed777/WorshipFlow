import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, Pressable, TextInput, 
    Button, Alert, FlatList, Modal, TouchableOpacity 
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'; 


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
    updateSetlist, // <-- PROP TO UPDATE SETLIST DATA
    deleteSetlist, // <-- PROP USED BY HEADER DELETE BUTTON
    setSongFormModalVisible, // <-- NEW PROP TO OPEN SONG FORM MODAL
}) {
    // --- FAB States ---
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [addPartModalVisible, setAddPartModalVisible] = useState(false);
    // ------------------
    
    // No longer needed: const [newPartTitle, setNewPartTitle] = useState('');

    const [linkModalVisible, setLinkModalVisible] = useState(false);
    const [partToLink, setPartToLink] = useState(null);

    // --- Edit Setlist Modal State ---
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState(currentSetlist?.name || '');
    const [editDescription, setEditDescription] = useState(currentSetlist?.description || '');

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

    // Sync edit fields when currentSetlist changes
    useEffect(() => {
        setEditName(currentSetlist?.name || '');
        setEditDescription(currentSetlist?.description || '');
    }, [currentSetlist]);

    const handleSaveEdit = async () => {
        const nameTrim = (editName || '').trim();
        if (!nameTrim) {
            Alert.alert('Validation', 'Setlist name cannot be empty.');
            return;
        }
        if (typeof updateSetlist === 'function') {
            try {
                await updateSetlist(currentSetlist.setlist_id, nameTrim, editDescription || '');
                setEditModalVisible(false);
                Alert.alert('Success', 'Setlist updated.');
            } catch (err) {
                console.error('Update setlist failed', err);
                Alert.alert('Error', 'Failed to update setlist.');
            }
        } else {
            Alert.alert('Error', 'Update function not available.');
        }
    };


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

    const handleAddNewSongFab = () => {
        setIsFabMenuOpen(false);
        setSongFormModalVisible(true);
    }


    // --- Renderer Functions ---

    const renderProgramPartItem = ({ item }) => {
        const linkedSong = getSong(item.song_id, songLibrary);
        
        return (
            <TouchableOpacity
                style={styles.partItem}
                activeOpacity={0.8}
                onPress={() => {
                    if (linkedSong) {
                        const partIndex = programParts.findIndex(p => p.part_id === item.part_id);
                        handleViewSongDetails(linkedSong.song_id, programParts, partIndex);
                    }
                }}
            >
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
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#FFFBE0' }]} 
                        onPress={(e) => { e.stopPropagation && e.stopPropagation(); handleOpenLinkModal(item.part_id); }}
                    >
                        <Feather name="link" size={20} color="#FFC107" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, { marginLeft: 8, backgroundColor: '#FFEBEE' }]} 
                        onPress={(e) => { e.stopPropagation && e.stopPropagation(); Alert.alert('Confirm Delete', `Delete part: ${item.title}?`, [{text: 'Cancel'}, {text: 'Delete', onPress: () => handleDeletePart(item.part_id), style: 'destructive'}]); }}
                    >
                        <Feather name="trash-2" size={20} color="#FF6347" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // --- Voice Memo Section Renderer ---
    // voice memo UI moved to per-part controls

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={handleHomePress} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#1a73e8" />
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                    <Text style={[styles.heading, { textAlign: 'center', flex: 1 }]} numberOfLines={1}>{currentSetlist.name}</Text>
                </View>
                <Pressable onPress={() => setEditModalVisible(true)} style={[styles.editHeaderButton]}>
                    <Feather name="edit-2" size={18} color="white" />
                </Pressable>
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
                
                {/* Voice memos moved to each Program Part (controls appear on each part) */}

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
                        {/* Option: Add New Song */}
                        <TouchableOpacity style={fabStyles.fabAction} onPress={handleAddNewSongFab}>
                            <Text style={fabStyles.fabActionText}>Add New Song</Text>
                            <Feather name="music" size={20} color="white" />
                        </TouchableOpacity>
                        
                        {/* Option: Add Program Part */}
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
            {/* --- Edit Setlist Modal --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <Pressable style={fabStyles.modalOverlay} onPress={() => setEditModalVisible(false)}>
                    <Pressable style={[fabStyles.partModalView, {width: '92%'}]} onPress={e => e.stopPropagation()}>
                        <Text style={[fabStyles.partModalTitle, {marginBottom: 8}]}>Edit Setlist</Text>
                        <TextInput
                            style={fabStyles.partModalInput}
                            placeholder="Setlist Name"
                            value={editName}
                            onChangeText={setEditName}
                            autoFocus={true}
                        />
                        <TextInput
                            style={[fabStyles.partModalInput, {height: 90, textAlignVertical: 'top'}]}
                            placeholder="Description (optional)"
                            value={editDescription}
                            onChangeText={setEditDescription}
                            multiline
                        />
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                            <Button title="Cancel" onPress={() => setEditModalVisible(false)} color="#777" />
                            <Button title="Save" onPress={handleSaveEdit} color="#1a73e8" />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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
    editHeaderButton: {
        marginLeft: 10,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
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