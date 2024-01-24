import PropTypes from 'prop-types';
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import useCurrentReportID from '@hooks/useCurrentReportID';

const PlaybackContext = React.createContext(null);

function PlaybackContextProvider({children}) {
    const [currentlyPlayingURL, setCurrentlyPlayingURL] = useState(null);
    const [sharedElement, setSharedElement] = useState(null);
    const [originalParent, setOriginalParent] = useState(null);
    const currentVideoPlayerRef = useRef(null);
    const {currentReportID} = useCurrentReportID();

    const pauseVideo = useCallback(() => {
        if (currentVideoPlayerRef && currentVideoPlayerRef.current && currentVideoPlayerRef.current.setStatusAsync) {
            currentVideoPlayerRef.current.setStatusAsync({shouldPlay: false});
        }
    }, [currentVideoPlayerRef]);

    const stopVideo = useCallback(() => {
        if (currentVideoPlayerRef && currentVideoPlayerRef.current && currentVideoPlayerRef.current.stopAsync) {
            currentVideoPlayerRef.current.stopAsync({shouldPlay: false});
        }
    }, [currentVideoPlayerRef]);

    const playVideo = useCallback(() => {
        if (currentVideoPlayerRef && currentVideoPlayerRef.current && currentVideoPlayerRef.current.setStatusAsync) {
            currentVideoPlayerRef.current.setStatusAsync({shouldPlay: true});
        }
    }, [currentVideoPlayerRef]);

    const unloadVideo = useCallback(() => {
        if (currentVideoPlayerRef && currentVideoPlayerRef.current && currentVideoPlayerRef.current.unloadAsync) {
            currentVideoPlayerRef.current.unloadAsync();
        }
    }, [currentVideoPlayerRef]);

    const updateCurrentlyPlayingURL = useCallback(
        (url) => {
            if (currentlyPlayingURL && url !== currentlyPlayingURL) {
                pauseVideo();
            }
            setCurrentlyPlayingURL(url);
        },
        [currentlyPlayingURL, pauseVideo],
    );

    const shareVideoPlayerElements = useCallback(
        (ref, parent, child) => {
            currentVideoPlayerRef.current = ref;
            setOriginalParent(parent);
            setSharedElement(child);
            playVideo();
        },
        [playVideo],
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
        }),
        [updateCurrentlyPlayingURL, currentlyPlayingURL, originalParent, sharedElement, shareVideoPlayerElements, playVideo, pauseVideo],
    );
    return <PlaybackContext.Provider value={contextValue}>{children}</PlaybackContext.Provider>;
}

function usePlaybackContext() {
    const context = useContext(PlaybackContext);
    if (context === undefined) {
        throw new Error('usePlaybackContext must be used within a PlaybackContextProvider');
    }
    return context;
}

PlaybackContextProvider.displayName = 'PlaybackContextProvider';
PlaybackContextProvider.propTypes = {
    /** Actual content wrapped by this component */
    children: PropTypes.node.isRequired,
};

export {PlaybackContextProvider, usePlaybackContext};
