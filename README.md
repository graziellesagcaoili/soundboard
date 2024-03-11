Note: Only tested in iOs platform

# Sound Recorder App

This Sound Recorder App is a React Native application developed using Expo. It allows users to record audio, play back recordings, and also play predefined sound files. The app uses SQLite for storing recording URIs, enabling persistent storage of recordings between sessions.

## Features

- Record audio with a simple button press.
- Play back recorded audio.
- Access and play predefined sounds.
- Store recording URIs in SQLite for persistent storage.

## Setup

To run this project, you will need to have Node.js and Expo CLI installed on your system.

To install dependencies:
npm install


Usage
To start recording, press the "Start Recording" button.
To stop recording, press the "Stop Recording" button again.
Play back a recording or predefined sound by pressing the corresponding "Play" button.
The app will automatically save recordings in the SQLite database.


Technologies
React Native - for building the mobile application.
Expo - for easy development and testing of React Native apps.
Expo AV - for handling audio recording and playback.
SQLite - for persistent storage of recording URIs.
