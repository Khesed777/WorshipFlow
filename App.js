import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, TextInput, Button, Text, StyleSheet, Alert, 
    ScrollView, FlatList, Pressable, Modal, TouchableOpacity, 
    Platform, StatusBar, Image, BackHandler 
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { initDB } from './src/database'; 
import { Feather } from '@expo/vector-icons';
import SetlistDetailScreen from './src/SetlistDetailScreen'; 
import Metronome from './Metronome';
import { logActivityToFile, LOG_FILE, readActivityLogFile } from './src/activityLogger';
import * as Sharing from 'expo-sharing';
import { chordDataUrls } from './src/chordGenerator';

// --- Component: AllSongsScreen ---
const AllSongsScreen = ({ songs, onSongPress, onClose, onDeleteSong, onUpdateSong }) => {
    const [search, setSearch] = useState("");
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [viewSongModalVisible, setViewSongModalVisible] = useState(false);
    const [selectedViewSong, setSelectedViewSong] = useState(null);
    const [lyricsFontSize, setLyricsFontSize] = useState(16);
    const [editLyricsHeight, setEditLyricsHeight] = useState(100);
    const [editingSong, setEditingSong] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editArtist, setEditArtist] = useState('');
    const [editKeyField, setEditKeyField] = useState('');
    const [editLyrics, setEditLyrics] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editType, setEditType] = useState('');
    
    // Android back button handling
    useEffect(() => {
        const onBackPress = () => {
            if (viewSongModalVisible) {
                setViewSongModalVisible(false);
                return true;
            }
            if (editModalVisible) {
                setEditModalVisible(false);
                return true;
            }
            if (onClose) onClose();
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [viewSongModalVisible, editModalVisible, onClose]);
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

    // Helper function to find which field matched and create highlighted text
    const getMatchedField = (item) => {
        const q = search.toLowerCase();
        if (!q) return null;
        
        if (item.title?.toLowerCase().includes(q)) {
            return { field: 'Title', value: item.title };
        }
        if (item.artist?.toLowerCase().includes(q)) {
            return { field: 'Artist', value: item.artist };
        }
        if (item.key?.toLowerCase().includes(q)) {
            return { field: 'Key', value: item.key };
        }
        if (item.category?.toLowerCase().includes(q)) {
            return { field: 'Category', value: item.category };
        }
        if (item.type?.toLowerCase().includes(q)) {
            return { field: 'Type', value: item.type };
        }
        if (item.lyrics?.toLowerCase().includes(q)) {
            // Show snippet of lyrics with match
            const start = Math.max(0, item.lyrics.toLowerCase().indexOf(q) - 20);
            const end = Math.min(item.lyrics.length, start + 60);
            let snippet = item.lyrics.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < item.lyrics.length) snippet = snippet + '...';
            return { field: 'Lyrics', value: snippet };
        }
        return null;
    };

    const renderSongItem = ({ item }) => {
        const matchedField = getMatchedField(item);
        
        return (
            <View style={[styles.setlistItemCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Pressable style={{ flex: 1 }} onPress={() => {
                    setSelectedViewSong(item);
                    setViewSongModalVisible(true);
                }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDetail}>{item.artist}</Text>
                    <Text style={styles.cardDetail}>Key: {item.key || 'N/A'}</Text>
                    {matchedField && search && (
                        <Text style={{ fontSize: 12, color: '#2196F3', fontWeight: '600', marginTop: 4, backgroundColor: '#e3f0fa', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 }}>
                            📍 {matchedField.field}: "{matchedField.value}"
                        </Text>
                    )}
                </Pressable>
            <View style={styles.songItemActions}>
                <TouchableOpacity
                    style={styles.songActionButton}
                    onPress={() => {
                        setEditingSong(item);
                        setEditTitle(item.title || '');
                        setEditArtist(item.artist || '');
                        setEditKeyField(item.key || '');
                        setEditLyrics(item.lyrics || '');
                        setEditCategory(item.category || '');
                        setEditType(item.type || '');
                        setEditModalVisible(true);
                    }}
                >
                    <Feather name="edit-2" size={18} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.songActionButton, { marginLeft: 8 }]}
                    onPress={() => onDeleteSong && onDeleteSong(item.song_id)}
                >
                    <Feather name="trash-2" size={18} color="#E53935" />
                </TouchableOpacity>
            </View>
        </View>
        );
    };

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
            {/* Edit Song Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <Pressable style={fabStyles.modalOverlay} onPress={() => setEditModalVisible(false)}>
                    <Pressable style={[fabStyles.partModalView, { width: '94%', marginBottom: 32 }]} onPress={e => e.stopPropagation()}>
                        <Text style={fabStyles.partModalTitle}>Edit Song</Text>
                        <TextInput style={fabStyles.partModalInput} placeholder="Title" value={editTitle} onChangeText={setEditTitle} />
                        <TextInput style={fabStyles.partModalInput} placeholder="Artist" value={editArtist} onChangeText={setEditArtist} />
                        <TextInput style={fabStyles.partModalInput} placeholder="Key" value={editKeyField} onChangeText={setEditKeyField} />
                        <TextInput style={[fabStyles.partModalInput, { height: Math.max(100, editLyricsHeight), textAlignVertical: 'top' }]} placeholder="Lyrics" value={editLyrics} onChangeText={setEditLyrics} onContentSizeChange={(e) => {
                            const h = e.nativeEvent.contentSize.height;
                            setEditLyricsHeight(Math.min(300, Math.max(100, h)));
                        }} multiline />
                        <TextInput style={fabStyles.partModalInput} placeholder="Category" value={editCategory} onChangeText={setEditCategory} />
                        <TextInput style={fabStyles.partModalInput} placeholder="Type" value={editType} onChangeText={setEditType} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 24 }}>
                            <Button title="Cancel" onPress={() => setEditModalVisible(false)} color="#777" />
                            <Button
                                title="Save"
                                onPress={async () => {
                                    if (!editingSong) return;
                                    if (!editTitle.trim()) { Alert.alert('Validation', 'Please enter a title.'); return; }
                                    if (onUpdateSong) {
                                        await onUpdateSong(editingSong.song_id, {
                                            title: editTitle.trim(),
                                            artist: editArtist.trim(),
                                            key: editKeyField.trim(),
                                            lyrics: editLyrics,
                                            category: editCategory.trim(),
                                            type: editType.trim(),
                                        });
                                        Alert.alert('Success', 'Song has been updated successfully!');
                                    }
                                    setEditModalVisible(false);
                                }}
                                color="#1a73e8"
                            />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
            {/* View Song Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={viewSongModalVisible}
                onRequestClose={() => setViewSongModalVisible(false)}
            >
                {selectedViewSong && (
                    <View style={[styles.modalView, { paddingBottom: 32 }]}>
                        <View style={styles.songModalHeader}>
                            <Text style={[styles.songModalSongTitle, { fontSize: 30, fontWeight: 'bold', color: '#222', marginBottom: 2, textAlign: 'center' }]}>
                                {selectedViewSong.title}
                            </Text>
                        </View>
                        <Text style={styles.modalArtist}>by {selectedViewSong.artist}</Text>
                        <Text style={styles.modalKey}>Key: {selectedViewSong.key || 'N/A'}</Text>
                        {selectedViewSong.category && <Text style={styles.modalKey}>Category: {selectedViewSong.category}</Text>}
                        {selectedViewSong.type && <Text style={styles.modalKey}>Type: {selectedViewSong.type}</Text>}
                        <View style={styles.separator} />
                        
                        {/* Font size controls */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, color: '#2196F3', fontWeight: '600', marginRight: 10 }}>Font Size</Text>
                            <TouchableOpacity
                                style={{ padding: 6, borderRadius: 6, backgroundColor: '#e3f0fa', marginRight: 4 }}
                                onPress={() => setLyricsFontSize(f => Math.max(12, f - 2))}
                            >
                                <Text style={{ fontSize: 16, color: '#2196F3', fontWeight: 'bold' }}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ padding: 6, borderRadius: 6, backgroundColor: '#e3f0fa' }}
                                onPress={() => setLyricsFontSize(f => Math.min(36, f + 2))}
                            >
                                <Text style={{ fontSize: 16, color: '#2196F3', fontWeight: 'bold' }}>+</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Lyrics */}
                        <ScrollView style={styles.modalLyricsScroll} contentContainerStyle={{flexGrow: 1, justifyContent: 'space-between'}}>
                            <Text style={[styles.modalLyricsText, { fontSize: lyricsFontSize, lineHeight: Math.round(lyricsFontSize * 1.35) }]}>
                                {selectedViewSong.lyrics || 'No lyrics available for this song.'}
                            </Text>
                            {/* Close Button */}
                            <View style={styles.modalButtonRow}>
                                <TouchableOpacity
                                    style={[styles.modalActionButton, styles.modalCloseAction]}
                                    onPress={() => setViewSongModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </Modal>
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
    const [playingChord, setPlayingChord] = useState(null);

    const chordFrequencies = {
        'A': [440, 554.37, 659.25], // A, C#, E
        'B': [493.88, 622.25, 739.99], // B, D#, F#
        'C': [261.63, 329.63, 392.00], // C, E, G
        'D': [293.66, 369.99, 440.00], // D, F#, A
        'E': [329.63, 415.30, 493.88], // E, G#, B
        'F': [349.23, 440.00, 523.25], // F, A, C
        'G': [392.00, 493.88, 587.33], // G, B, D
    };

    const playChord = async (note) => {
        try {
            setPlayingChord(note);
            
            // Get the base64 WAV data for the chord
            const audioUri = chordDataUrls[note];
            
            // Play using expo-av
            const { sound } = await Audio.Sound.createAsync({
                uri: audioUri,
            });
            await sound.playAsync();
            
            // Stop playing after sound finishes
            setTimeout(() => {
                setPlayingChord(null);
                sound.unloadAsync();
            }, 1200);
        } catch (error) {
            console.warn(`Could not play chord ${note}:`, error);
            setPlayingChord(null);
        }
    };

    // Android back button handling
    useEffect(() => {
        const onBackPress = () => {
            if (onClose) onClose();
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [onClose]);
    
    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7fbff', padding: 24 }} style={{ backgroundColor: '#f7fbff' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2196F3', marginBottom: 6, letterSpacing: 1, marginTop: 20 }}>Practice Resources</Text>
            <Text style={{ color: '#7bb6f7', fontSize: 15, marginBottom: 18, textAlign: 'center', maxWidth: 320 }}>
                Tools to help your worship team prepare and flow smoothly.
            </Text>
            
            {/* Metronome Section */}
            <View style={{ width: '100%', alignItems: 'center', backgroundColor: '#e3f0fa', borderRadius: 18, padding: 18, marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#2196F3', marginBottom: 10 }}>Metronome</Text>
                <Metronome />
            </View>

            {/* Chord Keys Section */}
            <View style={{ width: '100%', backgroundColor: '#e3f0fa', borderRadius: 18, padding: 18, marginBottom: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#2196F3', marginBottom: 16 }}>🎵 Chord Keys</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                    {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((note) => (
                        <TouchableOpacity
                            key={note}
                            style={{
                                backgroundColor: playingChord === note ? '#FF9800' : '#2196F3',
                                borderRadius: 10,
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 48,
                                shadowColor: '#2196F3',
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 4,
                            }}
                            onPress={() => playChord(note)}
                            disabled={playingChord !== null}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{note}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={{ fontSize: 12, color: '#7bb6f7', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
                    Tap any button to play the chord sound
                </Text>
            </View>

            {/* Chord Reference Guide Section - Full Screen Scrollable */}
            <ScrollView style={{ width: '100%', backgroundColor: '#e3f0fa', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#2196F3', marginBottom: 14, textAlign: 'center' }}>📚 Complete Chord Reference Guide</Text>
                    {/* Major Keys Section */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1976D2', marginBottom: 10, paddingLeft: 8 }}>🎼 MAJOR KEYS & CHORDS (All 12 Keys)</Text>
                        
                        {/* C Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>C Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: C  ii: Dm  iii: Em  IV: F  V: G  vi: Am  vii°: Bdim</Text>
                        </View>

                        {/* C# Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>C# Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: C#  ii: D#m  iii: E#m  IV: F#  V: G#  vi: A#m  vii°: B#dim</Text>
                        </View>

                        {/* D Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>D Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: D  ii: Em  iii: F#m  IV: G  V: A  vi: Bm  vii°: C#dim</Text>
                        </View>

                        {/* D# Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>D# (Eb) Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: Eb  ii: Fm  iii: Gm  IV: Ab  V: Bb  vi: Cm  vii°: Ddim</Text>
                        </View>

                        {/* E Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>E Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: E  ii: F#m  iii: G#m  IV: A  V: B  vi: C#m  vii°: D#dim</Text>
                        </View>

                        {/* F Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>F Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: F  ii: Gm  iii: Am  IV: Bb  V: C  vi: Dm  vii°: Edim</Text>
                        </View>

                        {/* F# Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>F# (Gb) Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: F#  ii: G#m  iii: A#m  IV: B  V: C#  vi: D#m  vii°: E#dim</Text>
                        </View>

                        {/* G Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>G Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: G  ii: Am  iii: Bm  IV: C  V: D  vi: Em  vii°: F#dim</Text>
                        </View>

                        {/* G# Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>G# (Ab) Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: Ab  ii: Bbm  iii: Cm  IV: Db  V: Eb  vi: Fm  vii°: Gdim</Text>
                        </View>

                        {/* A Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>A Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: A  ii: Bm  iii: C#m  IV: D  V: E  vi: F#m  vii°: G#dim</Text>
                        </View>

                        {/* A# Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>A# (Bb) Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: Bb  ii: Cm  iii: Dm  IV: Eb  V: F  vi: Gm  vii°: Adim</Text>
                        </View>

                        {/* B Major */}
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>B Major</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>I: B  ii: C#m  iii: D#m  IV: E  V: F#  vi: G#m  vii°: A#dim</Text>
                        </View>
                    </View>

                    {/* Minor Keys Section */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#7B1FA2', marginBottom: 10, paddingLeft: 8 }}>🎸 MINOR KEYS & CHORDS (All 12 Keys)</Text>
                        
                        {/* A Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>A Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Am  ii°: Bdim  III: C  iv: Dm  v: Em  VI: F  VII: G</Text>
                        </View>

                        {/* A# Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>A# (Bb) Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Bbm  ii°: Cdim  III: Db  iv: Ebm  v: Fm  VI: Gb  VII: Ab</Text>
                        </View>

                        {/* B Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>B Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Bm  ii°: C#dim  III: D  iv: Em  v: F#m  VI: G  VII: A</Text>
                        </View>

                        {/* C Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>C Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Cm  ii°: Ddim  III: Eb  iv: Fm  v: Gm  VI: Ab  VII: Bb</Text>
                        </View>

                        {/* C# Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>C# Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: C#m  ii°: D#dim  III: E  iv: F#m  v: G#m  VI: A  VII: B</Text>
                        </View>

                        {/* D Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>D Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Dm  ii°: Edim  III: F  iv: Gm  v: Am  VI: Bb  VII: C</Text>
                        </View>

                        {/* D# Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>D# (Eb) Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Ebm  ii°: Fdim  III: Gb  iv: Abm  v: Bbm  VI: Cb  VII: Db</Text>
                        </View>

                        {/* E Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>E Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Em  ii°: F#dim  III: G  iv: Am  v: Bm  VI: C  VII: D</Text>
                        </View>

                        {/* F Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>F Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Fm  ii°: Gdim  III: Ab  iv: Bbm  v: Cm  VI: Db  VII: Eb</Text>
                        </View>

                        {/* F# Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>F# (Gb) Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: F#m  ii°: G#dim  III: A  iv: Bm  v: C#m  VI: D  VII: E</Text>
                        </View>

                        {/* G Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>G Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: Gm  ii°: Adim  III: Bb  iv: Cm  v: Dm  VI: Eb  VII: F</Text>
                        </View>

                        {/* G# Minor */}
                        <View style={{ backgroundColor: '#f3e5f5', borderRadius: 10, padding: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 4 }}>G# (Ab) Minor (Natural)</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 16, fontFamily: 'monospace' }}>i: G#m  ii°: A#dim  III: B  iv: C#m  v: D#m  VI: E  VII: F#</Text>
                        </View>
                    </View>

                    {/* Quick Reference */}
                    <View style={{ backgroundColor: '#fff9c4', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#F57F17', marginBottom: 8 }}>💡 Music Theory Reference</Text>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 16 }}>
                            • Major chords: Root + Major 3rd + Perfect 5th{'\n'}
                            • Minor chords: Root + Minor 3rd + Perfect 5th{'\n'}
                            • I, IV, V are primary chords{'\n'}
                            • vi is the relative minor of I major{'\n'}
                            • All 12 chromatic keys included (C→B)
                        </Text>
                    </View>
            </ScrollView>
            
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
    const [mainTab, setMainTab] = useState('SETLIST'); // 'SETLIST' | 'SONGS' | 'TOOLS'
    const [bottomBoxHeight, setBottomBoxHeight] = useState(40);
    const [appInfoModalVisible, setAppInfoModalVisible] = useState(false);
    const [activityLogContent, setActivityLogContent] = useState('');
    const [dbViewerModalVisible, setDbViewerModalVisible] = useState(false);
    const [dbContent, setDbContent] = useState('');

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
    // Dynamic height for lyrics input in Add Song modal
    const [lyricsInputHeight, setLyricsInputHeight] = useState(120);

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

    // Function to load database summary for viewing
    const viewDatabaseInfo = async () => {
        if (!db) {
            Alert.alert('Error', 'Database not initialized');
            return;
        }
        try {
            const songCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM Song');
            const setlistCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM Setlist');
            const partCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM ProgramPart');
            const memoCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM VoiceMemo');
            
            // Get all songs data
            const allSongs = await db.getAllAsync('SELECT * FROM Song');
            const allSetlists = await db.getAllAsync('SELECT * FROM Setlist');
            const allParts = await db.getAllAsync('SELECT * FROM ProgramPart');
            const allMemos = await db.getAllAsync('SELECT * FROM VoiceMemo');
            
            let dbInfo = `DATABASE SUMMARY\n`;
            dbInfo += `================================\n\n`;
            dbInfo += `STATISTICS:\n`;
            dbInfo += `Total Songs: ${songCount.count}\n`;
            dbInfo += `Total Setlists: ${setlistCount.count}\n`;
            dbInfo += `Total Program Parts: ${partCount.count}\n`;
            dbInfo += `Total Voice Memos: ${memoCount.count}\n\n`;
            
            dbInfo += `SONGS (${allSongs.length}):\n`;
            dbInfo += `--------------------------------\n`;
            if (allSongs.length > 0) {
                allSongs.forEach((song, idx) => {
                    dbInfo += `${idx + 1}. ID: ${song.song_id}\n`;
                    dbInfo += `   Title: ${song.title || '(empty)'}\n`;
                    dbInfo += `   Artist: ${song.artist || '(empty)'}\n`;
                    dbInfo += `   Key: ${song.key || '(empty)'}\n`;
                    dbInfo += `   Category: ${song.category || '(empty)'}\n`;
                    dbInfo += `   Type: ${song.type || '(empty)'}\n`;
                    dbInfo += `   Lyrics: ${song.lyrics ? song.lyrics.substring(0, 30) + '...' : '(empty)'}\n\n`;
                });
            } else {
                dbInfo += `Nothing in it.\n\n`;
            }
            
            dbInfo += `SETLISTS (${allSetlists.length}):\n`;
            dbInfo += `--------------------------------\n`;
            if (allSetlists.length > 0) {
                allSetlists.forEach((setlist, idx) => {
                    dbInfo += `${idx + 1}. ID: ${setlist.setlist_id}\n`;
                    dbInfo += `   Name: ${setlist.name || '(empty)'}\n`;
                    dbInfo += `   Created: ${setlist.date_created || '(empty)'}\n`;
                    dbInfo += `   Description: ${setlist.description || '(empty)'}\n\n`;
                });
            } else {
                dbInfo += `Nothing in it.\n\n`;
            }
            
            dbInfo += `PROGRAM PARTS (${allParts.length}):\n`;
            dbInfo += `--------------------------------\n`;
            if (allParts.length > 0) {
                allParts.forEach((part, idx) => {
                    const setlist = allSetlists.find(s => s.setlist_id === part.setlist_id);
                    const song = allSongs.find(s => s.song_id === part.song_id);
                    dbInfo += `${idx + 1}. ID: ${part.part_id}\n`;
                    dbInfo += `   Title: ${part.title || '(empty)'}\n`;
                    dbInfo += `   Setlist: ${setlist?.name || '(empty)'} (ID: ${part.setlist_id})\n`;
                    dbInfo += `   Song: ${song?.title || '(empty)'} (ID: ${part.song_id || '(empty)'})\n\n`;
                });
            } else {
                dbInfo += `Nothing in it.\n\n`;
            }
            
            dbInfo += `VOICE MEMOS (${allMemos.length}):\n`;
            dbInfo += `--------------------------------\n`;
            if (allMemos.length > 0) {
                allMemos.forEach((memo, idx) => {
                    const part = allParts.find(p => p.part_id === memo.part_id);
                    const setlist = allSetlists.find(s => s.setlist_id === memo.setlist_id);
                    const durationSec = memo.duration ? (memo.duration / 1000).toFixed(2) : '(empty)';
                    dbInfo += `${idx + 1}. ID: ${memo.memo_id}\n`;
                    dbInfo += `   Setlist: ${setlist?.name || '(empty)'} (ID: ${memo.setlist_id})\n`;
                    dbInfo += `   Part: ${part?.title || '(empty)'} (ID: ${memo.part_id || '(empty)'})\n`;
                    dbInfo += `   Duration: ${durationSec} seconds\n`;
                    dbInfo += `   Recorded: ${memo.date_recorded || '(empty)'}\n`;
                    dbInfo += `   File Path: ${memo.file_path || '(empty)'}\n\n`;
                });
            } else {
                dbInfo += `Nothing in it.\n`;
            }
            
            setDbContent(dbInfo);
            setDbViewerModalVisible(true);
        } catch (error) {
            console.error('Error loading database info:', error);
            Alert.alert('Error', 'Failed to load database information');
        }
    };

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
            // Handle tab navigation back to SETLIST
            if (mainTab === 'SONGS' || mainTab === 'TOOLS') {
                setMainTab('SETLIST');
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
    }, [modalVisible, songFormModalVisible, setlistFormModalVisible, pictureScreenVisible, allSongsScreenVisible, currentSetlist, mainTab]);

    const addSong = () => {
        if (!title || !artist) { Alert.alert('Validation', 'Please enter at least title and artist.'); return; }
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); return; }
        db.runAsync(
            `INSERT INTO Song (title, artist, key, lyrics, category, type) VALUES (?, ?, ?, ?, ?, ?)`,
            [title, artist, key, lyrics, category, type]
        )
        .then(() => {
            logActivityToFile('CREATE', 'Song', null, { title, artist, key, lyrics, category, type });
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

    // --- Update Setlist (name, description) ---
    const updateSetlist = async (setlistId, newName, newDescription) => {
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); throw new Error('DB not initialized'); }
        try {
            await db.runAsync(`UPDATE Setlist SET name = ?, description = ? WHERE setlist_id = ?`, [newName, newDescription, setlistId]);
            logActivityToFile('UPDATE', 'Setlist', setlistId, { name: newName, description: newDescription });
            await loadAllData();
            if (currentSetlist && currentSetlist.setlist_id === setlistId) {
                setCurrentSetlist(prev => ({ ...prev, name: newName, description: newDescription }));
            }
        } catch (error) {
            console.error('Update setlist error:', error);
            Alert.alert('Error', 'Failed to update setlist.');
            throw error;
        }
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

    // --- Update Song (used by AllSongsScreen edit) ---
    const updateSong = async (songId, updates) => {
        if (!db) { Alert.alert('Error', 'Database not initialized yet!'); throw new Error('DB not initialized'); }
        try {
            await db.runAsync(
                `UPDATE Song SET title = ?, artist = ?, key = ?, lyrics = ?, category = ?, type = ? WHERE song_id = ?`,
                [updates.title || '', updates.artist || '', updates.key || '', updates.lyrics || '', updates.category || '', updates.type || '', songId]
            );
            await loadAllData();
        } catch (error) {
            console.error('Update song error:', error);
            Alert.alert('Error', 'Failed to update song.');
            throw error;
        }
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
            logActivityToFile('CREATE', 'Setlist', null, { name: setlistName, description: setlistDescription });
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
                            await db.runAsync(`DELETE FROM Setlist WHERE setlist_id = ?`, [setlistId]);
                            logActivityToFile('DELETE', 'Setlist', setlistId, { action: 'Setlist deleted' });
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
            logActivityToFile('CREATE', 'ProgramPart', result.lastInsertRowId, { title: partTitle, setlist_id: setlistId });
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
            logActivityToFile('DELETE', 'ProgramPart', partId, { action: 'Program part deleted' });
            Alert.alert('Success', 'Program Part deleted successfully.');
        } catch (error) {
            console.error('Delete Program Part error:', error);
            Alert.alert('Error', 'Failed to delete program part.');
        }
    };

    const addVoiceMemo = async (setlistId, partId, filePath) => {
        if (!db || !filePath || setlistId === null || setlistId === undefined) { 
            console.error('Add Voice Memo Error: DB, filePath, or setlistId missing.');
            logActivityToFile('ERROR', 'VoiceMemo', null, { error: 'Missing DB, filePath, or setlistId' });
            return Alert.alert('Error', 'Cannot save memo. Check logs.');
        }

        try {
            const dateCreated = new Date().toISOString().split('T')[0];
            const result = await db.runAsync(
                `INSERT INTO VoiceMemo (setlist_id, part_id, file_path, date_recorded) VALUES (?, ?, ?, ?)`,
                [setlistId, partId || null, filePath, dateCreated]
            );
            
            const newMemo = { memo_id: result.lastInsertRowId, setlist_id: setlistId, part_id: partId || null, file_path: filePath, date_recorded: dateCreated, };
            logActivityToFile('CREATE', 'VoiceMemo', result.lastInsertRowId, { setlist_id: setlistId, part_id: partId, date_recorded: dateCreated });

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
        logActivityToFile('DELETE', 'VoiceMemo', memoId, { file_path: memoToDelete.file_path });
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

    // --- Recording / Playback (per-part memos) ---
    const RECORDING_DIR = FileSystem.documentDirectory + 'voiceMemos/';
    const [recording, setRecording] = useState(null);
    const [sound, setSound] = useState(null);
    const [recordingPartId, setRecordingPartId] = useState(null);
    const [playingMemoId, setPlayingMemoId] = useState(null);

    const prepareRecordingDir = async () => {
        try {
            const dirInfo = await FileSystem.getInfoAsync(RECORDING_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(RECORDING_DIR, { intermediates: true });
            }
        } catch (err) {
            console.warn('Could not prepare recording dir', err);
        }
    };

    const startRecording = async (partId) => {
        // ensure only from within a part context
        setRecordingPartId(partId);
        logActivityToFile('ACTION', 'Recording', null, { action: 'Recording started', part_id: partId });
        try {
            await prepareRecordingDir();
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording.');
            setRecordingPartId(null);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
        } catch (e) {
            // ignore
        }
        await Audio.setAudioModeAsync({ allowsRecording: false });
        const uri = recording.getURI();
        setRecording(null);
        if (!uri) { setRecordingPartId(null); return; }

        const fileName = `memo_${Date.now()}.m4a`;
        const newFilePath = RECORDING_DIR + fileName;
        try {
            await FileSystem.moveAsync({ from: uri, to: newFilePath });
            logActivityToFile('ACTION', 'Recording', null, { action: 'Recording stopped and saved', part_id: recordingPartId, file: fileName });
            const result = await addVoiceMemo(currentSetlist.setlist_id, recordingPartId, newFilePath);
            if (!result) {
                await FileSystem.deleteAsync(newFilePath, { idempotent: true });
                Alert.alert('Save Error', 'Failed to save recording metadata.');
            }
        } catch (err) {
            console.error('Error saving recording', err);
            Alert.alert('Save Error', 'Failed to save recording file.');
        }
        setRecordingPartId(null);
    };

    const togglePlaybackForMemo = async (memo) => {
        if (!memo) return;
        const uri = memo.file_path;
        if (sound && playingMemoId === memo.memo_id) {
            const status = await sound.getStatusAsync();
            if (status.isPlaying) {
                await sound.pauseAsync();
                logActivityToFile('ACTION', 'Playback', null, { action: 'Memo paused', memo_id: memo.memo_id });
            } else {
                await sound.playAsync();
                logActivityToFile('ACTION', 'Playback', null, { action: 'Memo resumed', memo_id: memo.memo_id });
            }
            return;
        }
        if (sound) {
            try { await sound.unloadAsync(); } catch (e) {}
            setSound(null);
            setPlayingMemoId(null);
        }
        try {
            const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => {
                if (status.didJustFinish) {
                    newSound.unloadAsync();
                    setSound(null);
                    setPlayingMemoId(null);
                    logActivityToFile('ACTION', 'Playback', null, { action: 'Memo finished', memo_id: memo.memo_id });
                }
            });
            setSound(newSound);
            setPlayingMemoId(memo.memo_id);
            logActivityToFile('ACTION', 'Playback', null, { action: 'Memo playing', memo_id: memo.memo_id });
            await newSound.playAsync();
        } catch (err) {
            console.error('Playback error', err);
            Alert.alert('Playback Error', 'Failed to play memo.');
        }
    };

    const handleDeleteMemo = async (memoId) => {
        if (sound && playingMemoId === memoId) {
            try { await sound.unloadAsync(); } catch (e) {}
            setSound(null);
            setPlayingMemoId(null);
        }
        await deleteVoiceMemo(memoId);
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
    
    // Navigation for main tabs
    if (!currentSetlist) {
        if (mainTab === 'SONGS') {
            return (
                <AllSongsScreen 
                    songs={songs} 
                    onSongPress={(song) => {
                        setMainTab('SONGS');
                        handleSongPress(song);
                    }}
                    onClose={() => setMainTab('SETLIST')}
                    onDeleteSong={deleteSong}
                    onUpdateSong={updateSong}
                />
            );
        }
        if (mainTab === 'TOOLS') {
            return <AddPictureScreen onClose={() => setMainTab('SETLIST')} />;
        }
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
                        updateSetlist={updateSetlist}
                        deleteSetlist={deleteSetlist}
                        setSongFormModalVisible={setSongFormModalVisible}
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
                                    onPress={async () => {
                                        const logContent = await readActivityLogFile();
                                        setActivityLogContent(logContent);
                                        setAppInfoModalVisible(true);
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
                            <TouchableOpacity
                                style={styles.fabMainMinimal}
                                onPress={() => setIsCollapsed(!isCollapsed)}
                            >
                                <Text style={styles.fabMainTextMinimal}>{isCollapsed ? '+' : 'x'}</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Bottom Navigation Bar */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#e3f0fa', paddingBottom: 18, paddingTop: 6, borderTopWidth: 1, borderColor: '#b3c6e6', marginTop: 8 }}>
                            <TouchableOpacity onPress={() => setMainTab('SETLIST')} style={{ alignItems: 'center', flex: 1 }}>
                                <Feather name="list" size={24} color={mainTab === 'SETLIST' ? '#2196F3' : '#7bb6f7'} />
                                <Text style={{ color: mainTab === 'SETLIST' ? '#2196F3' : '#7bb6f7', fontWeight: 'bold', fontSize: 13, marginTop: 2 }}>SETLIST</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMainTab('SONGS')} style={{ alignItems: 'center', flex: 1 }}>
                                <Feather name="music" size={24} color={mainTab === 'SONGS' ? '#2196F3' : '#7bb6f7'} />
                                <Text style={{ color: mainTab === 'SONGS' ? '#2196F3' : '#7bb6f7', fontWeight: 'bold', fontSize: 13, marginTop: 2 }}>SONGS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMainTab('TOOLS')} style={{ alignItems: 'center', flex: 1 }}>
                                <Feather name="tool" size={24} color={mainTab === 'TOOLS' ? '#2196F3' : '#7bb6f7'} />
                                <Text style={{ color: mainTab === 'TOOLS' ? '#2196F3' : '#7bb6f7', fontWeight: 'bold', fontSize: 13, marginTop: 2 }}>TOOLS</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Blank Box Below Navbar */}
                        <View style={{ backgroundColor: '#f7fbff', height: bottomBoxHeight, borderTopWidth: 1, borderColor: '#e3f0fa' }} />
                    </View>
                )}
            </View>
            {/* App Info Modal with Activity Log */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={appInfoModalVisible}
                onRequestClose={() => setAppInfoModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20, paddingBottom: 32 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2196F3' }}>App Information</Text>
                            <TouchableOpacity onPress={() => setAppInfoModalVisible(false)}>
                                <Feather name="x" size={28} color="#2196F3" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: '100%' }} showsVerticalScrollIndicator={true}>
                            {/* App Info Section */}
                            <View style={{ marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>Prepared by: Team JJJM (Group 1)</Text>
                                <Text style={{ fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 }}>
                                    Jainie M. Eking{'\n'}
                                    Johari Gandawali{'\n'}
                                    Mickey Nadayag{'\n'}
                                    Jade B. Ramos
                                </Text>
                                <Text style={{ fontSize: 14, color: '#666', fontWeight: '500', marginBottom: 4 }}>
                                    University of Science and Technology of Southern Philippines
                                </Text>
                                <Text style={{ fontSize: 13, color: '#666' }}>
                                    Main Campus - Alubijid
                                </Text>
                                <Text style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                                    Passed for Software Engineering Project • 2025
                                </Text>
                            </View>

                            {/* Activity Log Section */}
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>📋 Activity Log</Text>
                                <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, maxHeight: 300 }}>
                                    {activityLogContent.trim() ? (
                                        <ScrollView nestedScrollEnabled={true}>
                                            <Text style={{ fontSize: 12, color: '#333', lineHeight: 18, fontFamily: 'monospace' }}>
                                                {activityLogContent}
                                            </Text>
                                        </ScrollView>
                                    ) : (
                                        <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 20 }}>
                                            No activity logged yet.
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 10, marginTop: 12, alignItems: 'center' }}
                                    onPress={async () => {
                                        try {
                                            await Sharing.shareAsync(LOG_FILE);
                                        } catch (err) {
                                            Alert.alert('Error', 'Unable to share log file.');
                                        }
                                    }}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>📤 Share Activity Log</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Database Viewer Section */}
                            <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>💾 Database Information</Text>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                                    onPress={viewDatabaseInfo}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>📊 View Database</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={{ backgroundColor: '#e3f0fa', borderRadius: 8, paddingVertical: 12, marginTop: 16, alignItems: 'center' }}
                            onPress={() => setAppInfoModalVisible(false)}
                        >
                            <Text style={{ color: '#2196F3', fontWeight: 'bold', fontSize: 14 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Database Viewer Modal - Fullscreen */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={dbViewerModalVisible}
                onRequestClose={() => setDbViewerModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 4, paddingBottom: 4 }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#e3f0fa', borderBottomWidth: 1, borderBottomColor: '#2196F3' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2196F3' }}>💾 Database Contents</Text>
                        <TouchableOpacity onPress={() => setDbViewerModalVisible(false)}>
                            <Feather name="x" size={28} color="#2196F3" />
                        </TouchableOpacity>
                    </View>

                    {/* Database Content */}
                    <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}>
                        <Text style={{ fontSize: 12, color: '#333', lineHeight: 18, fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
                            {dbContent}
                        </Text>
                    </ScrollView>

                    {/* Close Button */}
                    <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <TouchableOpacity
                            style={{ flex: 1, backgroundColor: '#2196F3', borderRadius: 6, paddingVertical: 8, alignItems: 'center' }}
                            onPress={() => setDbViewerModalVisible(false)}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={setlistFormModalVisible}
                onRequestClose={() => setSetlistFormModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(33,150,243,0.08)', paddingBottom: 32 }}>

                    <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', shadowColor: '#2196F3', shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, marginBottom: 32 }}>
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
                transparent={true}
                visible={songFormModalVisible}
                onRequestClose={() => setSongFormModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(33,150,243,0.08)', paddingBottom: 32 }}>
                    <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', shadowColor: '#2196F3', shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, maxHeight: '90%', marginBottom: 32 }}>
                        <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#2196F3', marginBottom: 18, letterSpacing: 1 }}>Add New Song</Text>
                        <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                            <TextInput
                                style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16, marginBottom: 12 }]}
                                placeholder="Title (Required)"
                                placeholderTextColor="#7bb6f7"
                                value={title}
                                onChangeText={setTitle}
                            />
                            <TextInput
                                style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16, marginBottom: 12 }]}
                                placeholder="Artist (Required)"
                                placeholderTextColor="#7bb6f7"
                                value={artist}
                                onChangeText={setArtist}
                            />
                            <TextInput
                                style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16, marginBottom: 12 }]}
                                placeholder="Key"
                                placeholderTextColor="#7bb6f7"
                                value={key}
                                onChangeText={setKey}
                            />
                            <TextInput
                                style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16, height: Math.max(100, lyricsInputHeight), textAlignVertical: 'top', marginBottom: 12 }]}
                                placeholder="Lyrics"
                                placeholderTextColor="#7bb6f7"
                                value={lyrics}
                                onChangeText={setLyrics}
                                onContentSizeChange={(e) => {
                                    const h = e.nativeEvent.contentSize.height;
                                    setLyricsInputHeight(Math.min(300, Math.max(100, h)));
                                }}
                                multiline
                            />
                            <TextInput
                                style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16, marginBottom: 12 }]}
                                placeholder="Category"
                                placeholderTextColor="#7bb6f7"
                                value={category}
                                onChangeText={setCategory}
                            />
                            <TextInput
                                style={[styles.input, { borderColor: '#b3c6e6', backgroundColor: '#e3f0fa', fontSize: 16, marginBottom: 14 }]}
                                placeholder="Type"
                                placeholderTextColor="#7bb6f7"
                                value={type}
                                onChangeText={setType}
                            />
                        </ScrollView>
                        <TouchableOpacity
                            style={{ backgroundColor: '#2196F3', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 12, width: '100%', alignItems: 'center' }}
                            onPress={addSong}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>Save Song</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: '#e3f0fa', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' }}
                            onPress={() => setSongFormModalVisible(false)}
                        >
                            <Text style={{ color: '#2196F3', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                {selectedSong && (
                    <View style={[styles.modalView, { paddingBottom: 4 }]}>
                        {/* Fixed Header: Program Part Name and Song Title */}
                        <View style={styles.songModalHeader}>
                            {modalProgramParts && modalProgramParts.length > 0 && modalCurrentPartIndex !== null && modalCurrentPartIndex >= 0 ? (
                                <>
                                    <Text style={[styles.songModalPartName, { fontSize: 15, color: '#2196F3', fontWeight: '600', marginBottom: 2, textAlign: 'center' }]}> 
                                        {modalProgramParts[modalCurrentPartIndex]?.title || 'Program Part'}
                                    </Text>
                                    <Text style={[styles.songModalSongTitle, { fontSize: 30, fontWeight: 'bold', color: '#222', marginBottom: 2, textAlign: 'center' }]}> 
                                        {selectedSong.title}
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.songModalSongTitle, { fontSize: 30, fontWeight: 'bold', color: '#222', marginBottom: 2, textAlign: 'center' }]}>{selectedSong.title}</Text>
                            )}
                        </View>

                        {/* Scrollable Content: Song Info, Record Button, Font Controls, and Lyrics */}
                        <ScrollView style={styles.modalLyricsScroll} contentContainerStyle={{flexGrow: 1}}>
                            {/* Song Info */}
                            <View>
                                <Text style={styles.modalArtist}>by {selectedSong.artist}</Text>
                                <Text style={styles.modalKey}>Key: {selectedSong.key || 'N/A'}</Text>
                                <View style={styles.separator} />
                            </View>
                            
                            {/* Memo controls + Font size controls - available only when opened from a program part */}
                            {modalProgramParts && modalProgramParts.length > 0 && modalCurrentPartIndex !== null ? (() => {
                                const currentPart = modalProgramParts[modalCurrentPartIndex];
                                const partMemo = voiceMemos.find(m => m.part_id === currentPart.part_id);
                                return (
                                    <View style={{ paddingHorizontal: 16, marginBottom: 12, backgroundColor: '#f7fbff', borderRadius: 8, padding: 12, flexDirection: 'row', gap: 12 }}>
                                        {/* Font Size Controls - Left Side */}
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                            <Text style={{ fontSize: 13, color: '#2196F3', fontWeight: '600', marginRight: 8 }}>Font Size</Text>
                                            <TouchableOpacity
                                                style={{ padding: 6, borderRadius: 6, backgroundColor: '#e3f0fa', marginRight: 4 }}
                                                onPress={() => setLyricsFontSize(f => Math.max(12, f - 2))}
                                            >
                                                <Text style={{ fontSize: 16, color: '#2196F3', fontWeight: 'bold' }}>−</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ padding: 6, borderRadius: 6, backgroundColor: '#e3f0fa' }}
                                                onPress={() => setLyricsFontSize(f => Math.min(36, f + 2))}
                                            >
                                                <Text style={{ fontSize: 16, color: '#2196F3', fontWeight: 'bold' }}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                        
                                        {/* Memo controls - Right Side */}
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            {recording && recordingPartId === currentPart.part_id ? (
                                                <>
                                                    <Feather name="mic" size={18} color="#E53935" style={{ marginRight: 8 }} />
                                                    <Text style={{ fontSize: 14, color: '#E53935', fontWeight: '600', marginRight: 8 }}>Recording...</Text>
                                                    <TouchableOpacity style={{ padding: 8, backgroundColor: '#E53935', borderRadius: 6 }} onPress={stopRecording}>
                                                        <Feather name="square" size={16} color="white" />
                                                    </TouchableOpacity>
                                                </>
                                            ) : partMemo ? (
                                                <>
                                                    <Feather name="music" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
                                                    <Text style={{ fontSize: 14, color: '#333', fontWeight: '500', marginRight: 8 }}>Part Memo</Text>
                                                    <TouchableOpacity style={{ padding: 6, backgroundColor: '#4CAF50', borderRadius: 6, marginRight: 6 }} onPress={() => togglePlaybackForMemo(partMemo)}>
                                                        <Feather name={playingMemoId === partMemo.memo_id ? 'pause' : 'play'} size={16} color="white" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={{ padding: 6, backgroundColor: '#FFEBEE', borderRadius: 6 }} onPress={() => handleDeleteMemo(partMemo.memo_id)}>
                                                        <Feather name="trash-2" size={16} color="#E53935" />
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <>
                                                    <Feather name="mic" size={18} color="#9C27B0" style={{ marginRight: 8 }} />
                                                    <Text style={{ fontSize: 14, color: '#333', fontWeight: '500', marginRight: 8 }}>No Memo</Text>
                                                    <TouchableOpacity style={{ padding: 8, backgroundColor: '#9C27B0', borderRadius: 6 }} onPress={() => startRecording(currentPart.part_id)}>
                                                        <Feather name="mic" size={16} color="white" />
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                );
                            })() : null}

                            {/* Lyrics */}
                            <Text style={[styles.modalLyricsText, { fontSize: lyricsFontSize, lineHeight: Math.round(lyricsFontSize * 1.35) }]}> 
                                {selectedSong.lyrics || 'No lyrics available for this song.'}
                            </Text>
                        </ScrollView>
                        
                        {/* Navigation Buttons Row (fixed at bottom, outside scroll) */}
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
                                                <Text style={[styles.closeButtonText, { fontSize: 13 }]}>← Prev</Text>
                                                <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{prevPart.title}</Text>
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
                                    <Text style={[styles.closeButtonText, { fontSize: 13 }]}>Close</Text>
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
                                                <Text style={[styles.closeButtonText, { fontSize: 13 }]}>Next →</Text>
                                                <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{nextPart.title}</Text>
                                            </TouchableOpacity>
                                        );
                                    }
                                    return null;
                                })() : null}
                            </View>
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
        paddingBottom: 120 
    },

    songItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    songActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'transparent',
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
        paddingTop: 4, 
        paddingBottom: 4,
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
        marginTop: 4, 
        gap: 4,
        paddingVertical: 2,
        paddingHorizontal: 8,
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
        bottom: 112,
        right: 20,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        paddingTop: 20,
        alignItems: 'center',
        marginHorizontal: -20,
        marginTop: 0,
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
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
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

// Modal / FAB-specific styles reused by in-file modals
const fabStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    partModalView: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 18,
        elevation: 10,
    },
    partModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#1a73e8',
    },
    partModalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 16,
        width: '100%',
        backgroundColor: '#fff',
    },
});