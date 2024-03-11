import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('sound.db');

export default function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState([]);
    const [playback, setPlayback] = useState(null);
    const [permissionsResponse, requestPermission] = Audio.usePermissions();
    const [predefinedSounds, setPredefinedSounds] = useState([
        { sound: null, status: 'unloaded' }, // Sound 1
        { sound: null, status: 'unloaded' }, // Sound 2
        { sound: null, status: 'unloaded' }  // Sound 3
    ]);
    const [dbRecordings, setDbRecordings] = useState([]);



    const loadPredefinedSounds = async () => {
        const soundURIs = [
            require('./sounds/sound1.mp4'), // Replace with your actual file paths
            require('./sounds/sound2.mp4'),
            require('./sounds/sound3.mp4'),
        ];
        const soundObjects = await Promise.all(soundURIs.map(async (uri) => {
            const { sound } = await Audio.Sound.createAsync(uri);
            return { sound: sound, status: 'loaded' };
        }));
        setPredefinedSounds(soundObjects);
    };

    const handlePredefinedSoundPress = async (index) => {
        const currentSoundObj = predefinedSounds[index];
        const currentSound = currentSoundObj.sound;

        try {
            // Check the playback status and take action accordingly
            if (currentSoundObj.status === 'unloaded') {
                await loadPredefinedSounds();
            }

            if (currentSoundObj.status === 'loaded' || currentSoundObj.status === 'stopped') {
                await currentSound.playAsync();
                updatePredefinedSoundStatus(index, 'playing');
            } else if (currentSoundObj.status === 'playing') {
                await currentSound.pauseAsync();
                updatePredefinedSoundStatus(index, 'paused');
            } else if (currentSoundObj.status === 'paused') {
                await currentSound.playAsync();
                updatePredefinedSoundStatus(index, 'playing');
            }
        } catch (error) {
            console.error(`Error on sound action [${currentSoundObj.status}]`, error);
        }
    };


    const updatePredefinedSoundStatus = (index, status) => {
        setPredefinedSounds(sounds => {
            const updatedSounds = [...sounds];
            updatedSounds[index] = { ...updatedSounds[index], status: status };
            return updatedSounds;
        });
    };


   /* const playPredefinedSound = async (index) => {
        try {
            const soundToPlay = predefinedSounds[index];
            await soundToPlay.replayAsync(); // Use replayAsync to play from the start
        } catch (error) {
            console.error("Error playing predefined sound:", error);
        }
    };*/

    useEffect(() => {
        loadPredefinedSounds();

        db.transaction(tx => {
            tx.executeSql(
                "CREATE TABLE IF NOT EXISTS recordings (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT, date DATETIME)",
                [],
                () => console.log('Table created successfully'),
                error => console.log('Error creating table:', error)
            );
        });

        return () => {
            predefinedSounds.forEach(({ sound }) => {
                sound?.unloadAsync();
            });
        };
    }, []);



    const startRecording = async () => {
        try {
            // Request permission 
            if (permissionsResponse.status !== 'granted') {
                console.log("Requesting permissions");
                await requestPermission();
            }
            console.log("Permission is ", permissionsResponse.status);

           
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log("Starting recording...");
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setIsRecording(true);
            console.log("...recording started");

          
            setRecordings(prevRecordings => [...prevRecordings, recording]);
        } catch (error) {
            console.error("Failed to start recording: ", error);
        }
    };

    const stopRecording = async () => {
        try {
            console.log("Stopping recording...");
            const currentRecording = recordings[recordings.length - 1];
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();
            setRecordings(prevRecordings => {
                const updatedRecordings = [...prevRecordings];
                updatedRecordings[updatedRecordings.length - 1] = { uri };
                return updatedRecordings;
            });
            setIsRecording(false);
            console.log("Recording stopped and stored at ", uri);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            // Insert the URI into the database
            db.transaction(tx => {
                tx.executeSql("INSERT INTO recordings (uri, date) VALUES (?, datetime('now'))", [uri],
                    () => console.log('URI inserted successfully'),
                    error => console.log('Error inserting URI:', error)
                );
            });

        } catch (error) {
            console.error("Failed to stop recording: ", error);
        }
    };

    const fetchRecordings = () => {
        db.transaction(tx => {
            tx.executeSql(
                "SELECT * FROM recordings",
                [],
                (_, { rows }) => {
                    let recordings = [];
                    for (let i = 0; i < rows.length; i++) {
                        recordings.push(rows.item(i));
                    }
                    setDbRecordings(recordings);
                },
                error => console.log('Error fetching recordings:', error)
            );
        });
    };


    const playRecording = async (uri) => {
        console.log("Playing recording from ", uri);
        if (playback) {
            await playback.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync({ uri });
        setPlayback(sound);
        await sound.playAsync();
    };

    useEffect(() => {
        fetchRecordings();
        return () => {
            recordings.forEach(recording => {
                if (typeof recording.stopAndUnloadAsync === 'function') {
                    recording.stopAndUnloadAsync();
                }
            });
        };
    }, []);

    const playDbRecording = async (uri) => {
        try {
            const { sound } = await Audio.Sound.createAsync({ uri });
            await sound.playAsync();
            // Optionally, you can keep track of the sound object for pausing or stopping it later.
        } catch (error) {
            console.error('Error playing recording from URI:', error);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.button} onPress={isRecording ? stopRecording : startRecording}>
                <Text style={styles.buttonText}>{isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
            </TouchableOpacity>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}>
                {predefinedSounds.map((soundData, index) => (
                    <TouchableOpacity key={index} style={styles.recordingItem} onPress={() => handlePredefinedSoundPress(index)}>
                        <Text style={styles.recordingText}>{`Play Predefined Sound ${index + 1} - Status: ${soundData.status}`}</Text>
                    </TouchableOpacity>
                ))}
                {dbRecordings.map((recording, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.recordingItem}
                        onPress={() => playDbRecording(recording.uri)}
                    >
                        <Text style={styles.recordingText}>Play Recording {index + 1}</Text>
                    </TouchableOpacity>
                ))}
                {recordings.map((recording, index) => recording.uri && (
                    <TouchableOpacity key={index} style={styles.recordingItem} onPress={() => playRecording(recording.uri)}>
                        <Text style={styles.recordingText}>{`Play Sound ${index + 1}`}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

 

            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        marginTop: 60,
    },
    button: {
        backgroundColor: '#007AFF', 
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        margin: 10,
        width: '90%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18, 
        fontWeight: '600', 
    },
    scrollView: {
        flex: 1,
    },
    recordingItem: {
        backgroundColor: '#F2F2F7', 
        borderBottomWidth: 1, 
        borderBottomColor: '#C7C7CC', 
        padding: 15,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingText: {
        color: '#000', 
        fontSize: 16,
    },
});
