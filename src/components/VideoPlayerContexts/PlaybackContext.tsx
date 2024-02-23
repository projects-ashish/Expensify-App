import type {Video} from 'expo-av';
import PropTypes from 'prop-types';
import type {ReactNode} from 'react';
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import type {View} from 'react-native';
import useCurrentReportID from '@hooks/useCurrentReportID';
import type {PlaybackContext} from './types';

const Context = React.createContext<PlaybackContext | null>(null);

function PlaybackContextProvider({children}: {children: ReactNode}) {
    const [currentlyPlayingURL, setCurrentlyPlayingURL] = useState<string | null>(null);
    const [sharedElement, setSharedElement] = useState<View | null>(null);
    const [originalParent, setOriginalParent] = useState<View | null>(null);
    const currentVideoPlayerRef = useRef<Video | null>(null);
    const {currentReportID} = useCurrentReportID() ?? {};

    const pauseVideo = useCallback(() => {
        currentVideoPlayerRef.current?.setStatusAsync({shouldPlay: false});
    }, [currentVideoPlayerRef]);

    const stopVideo = useCallback(() => {
        if (!currentVideoPlayerRef?.current?.stopAsync) {
            return;
        }
        currentVideoPlayerRef.current.stopAsync();
    }, [currentVideoPlayerRef]);

    const playVideo = useCallback(() => {
        if (!currentVideoPlayerRef?.current?.setStatusAsync) {
            return;
        }
        currentVideoPlayerRef.current.getStatusAsync().then((status) => {
            if (status.isLoaded && status.durationMillis === status.positionMillis) {
                currentVideoPlayerRef.current?.setStatusAsync({shouldPlay: true, positionMillis: 0});
            } else {
                currentVideoPlayerRef.current?.setStatusAsync({shouldPlay: true});
            }
        });
    }, [currentVideoPlayerRef]);

    const unloadVideo = useCallback(() => {
        if (!currentVideoPlayerRef?.current?.unloadAsync) {
            return;
        }
        currentVideoPlayerRef.current.unloadAsync();
    }, [currentVideoPlayerRef]);

    const updateCurrentlyPlayingURL = useCallback(
        (url: string) => {
            if (currentlyPlayingURL && url !== currentlyPlayingURL) {
                pauseVideo();
            }
            setCurrentlyPlayingURL(url);
        },
        [currentlyPlayingURL, pauseVideo],
    );

    const shareVideoPlayerElements = useCallback(
        (ref: Video, parent: View, child: View) => {
            currentVideoPlayerRef.current = ref;
            setOriginalParent(parent);
            setSharedElement(child);
            playVideo();
        },
        [playVideo],
    );

    const checkVideoPlaying = useCallback(
        (statusCallback: (isPlaying: boolean) => void) => {
            currentVideoPlayerRef.current?.getStatusAsync().then((status) => {
                statusCallback('isPlaying' in status && status.isPlaying);
            });
        },
        [currentVideoPlayerRef],
    );

    const resetVideoPlayerData = useCallback(() => {
        stopVideo();
        unloadVideo();
        setCurrentlyPlayingURL(null);
        setSharedElement(null);
        setOriginalParent(null);
        currentVideoPlayerRef.current = null;
    }, [stopVideo, unloadVideo]);

    useEffect(() => {
        if (!currentReportID) {
            return;
        }
        resetVideoPlayerData();
    }, [currentReportID, resetVideoPlayerData]);

    const contextValue = useMemo(
        () => ({
            updateCurrentlyPlayingURL,
            currentlyPlayingURL,
            originalParent,
            sharedElement,
            currentVideoPlayerRef,
            shareVideoPlayerElements,
            playVideo,
            pauseVideo,
            checkVideoPlaying,
        }),
        [updateCurrentlyPlayingURL, currentlyPlayingURL, originalParent, sharedElement, shareVideoPlayerElements, playVideo, pauseVideo, checkVideoPlaying],
    );
    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

function usePlaybackContext() {
    const playbackContext = useContext(Context);
    if (!playbackContext) {
        throw new Error('usePlaybackContext must be used within a PlaybackContextProvider');
    }
    return playbackContext;
}

PlaybackContextProvider.displayName = 'PlaybackContextProvider';
PlaybackContextProvider.propTypes = {
    /** Actual content wrapped by this component */
    children: PropTypes.node.isRequired,
};

export {PlaybackContextProvider, usePlaybackContext};
