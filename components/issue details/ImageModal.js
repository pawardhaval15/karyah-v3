import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageModal({ visible, image, onClose, theme }) {
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const [lastScale, setLastScale] = useState(1);
    const [lastTranslateX, setLastTranslateX] = useState(0);
    const [lastTranslateY, setLastTranslateY] = useState(0);
    const [initialDistance, setInitialDistance] = useState(null);
    const [initialScale, setInitialScale] = useState(1);
    const [lastTap, setLastTap] = useState(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                // Set initial values when gesture starts
                if (evt.nativeEvent.touches.length === 2) {
                    // Pinch gesture starting
                    const touches = evt.nativeEvent.touches;
                    const distance = Math.sqrt(
                        Math.pow(touches[0].pageX - touches[1].pageX, 2) +
                        Math.pow(touches[0].pageY - touches[1].pageY, 2)
                    );
                    setInitialDistance(distance);
                    setInitialScale(lastScale);
                } else if (evt.nativeEvent.touches.length === 1 && lastScale > 1) {
                    // Single touch panning when zoomed
                    translateX.setOffset(lastTranslateX);
                    translateY.setOffset(lastTranslateY);
                    translateX.setValue(0);
                    translateY.setValue(0);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (evt.nativeEvent.touches.length === 2) {
                    // Pinch to zoom
                    const touches = evt.nativeEvent.touches;
                    const distance = Math.sqrt(
                        Math.pow(touches[0].pageX - touches[1].pageX, 2) +
                        Math.pow(touches[0].pageY - touches[1].pageY, 2)
                    );
                    
                    if (initialDistance && initialDistance > 0) {
                        const scaleRatio = distance / initialDistance;
                        const newScale = initialScale * scaleRatio;
                        const constrainedScale = Math.max(0.8, Math.min(newScale, 5));
                        scale.setValue(constrainedScale);
                    }
                } else if (evt.nativeEvent.touches.length === 1 && lastScale > 1) {
                    // Pan when zoomed
                    translateX.setValue(gestureState.dx);
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (evt.nativeEvent.touches.length === 0) {
                    // Check for double tap
                    const now = Date.now();
                    const DOUBLE_TAP_DELAY = 300;
                    
                    if (now - lastTap < DOUBLE_TAP_DELAY && Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
                        // Double tap detected - toggle zoom
                        const currentScale = scale._value;
                        if (currentScale > 1.5) {
                            resetZoom();
                        } else {
                            // Zoom to 2x
                            Animated.parallel([
                                Animated.spring(scale, { toValue: 2, useNativeDriver: true }),
                                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
                                Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
                            ]).start();
                            setLastScale(2);
                            setLastTranslateX(0);
                            setLastTranslateY(0);
                        }
                        setLastTap(0); // Reset to prevent triple tap
                        return;
                    }
                    
                    setLastTap(now);
                    
                    // All fingers lifted
                    const currentScale = scale._value;
                    
                    // Update scale state
                    setLastScale(currentScale);
                    
                    // Handle translation bounds if panning occurred
                    if (currentScale > 1 && (gestureState.dx !== 0 || gestureState.dy !== 0)) {
                        translateX.flattenOffset();
                        translateY.flattenOffset();
                        
                        const currentTranslateX = translateX._value;
                        const currentTranslateY = translateY._value;
                        
                        // Calculate bounds
                        const maxTranslateX = (screenWidth * (currentScale - 1)) / 2;
                        const maxTranslateY = (500 * (currentScale - 1)) / 2;
                        
                        const constrainedTranslateX = Math.max(-maxTranslateX, Math.min(currentTranslateX, maxTranslateX));
                        const constrainedTranslateY = Math.max(-maxTranslateY, Math.min(currentTranslateY, maxTranslateY));
                        
                        if (constrainedTranslateX !== currentTranslateX || constrainedTranslateY !== currentTranslateY) {
                            Animated.parallel([
                                Animated.spring(translateX, { toValue: constrainedTranslateX, useNativeDriver: true }),
                                Animated.spring(translateY, { toValue: constrainedTranslateY, useNativeDriver: true }),
                            ]).start();
                        }
                        
                        setLastTranslateX(constrainedTranslateX);
                        setLastTranslateY(constrainedTranslateY);
                    }
                    
                    // Reset to normal if zoomed out too much
                    if (currentScale < 0.9) {
                        resetZoom();
                    }
                    
                    // Reset pinch data
                    setInitialDistance(null);
                    setInitialScale(1);
                }
            },
        })
    ).current;

    const resetZoom = () => {
        try {
            // Clear any existing offsets
            scale.flattenOffset();
            translateX.flattenOffset();
            translateY.flattenOffset();
            
            // Reset to default values
            Animated.parallel([
                Animated.spring(scale, { 
                    toValue: 1, 
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8
                }),
                Animated.spring(translateX, { 
                    toValue: 0, 
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8
                }),
                Animated.spring(translateY, { 
                    toValue: 0, 
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8
                }),
            ]).start();
            
            setLastScale(1);
            setLastTranslateX(0);
            setLastTranslateY(0);
            setInitialDistance(null);
            setInitialScale(1);
        } catch (error) {
            console.warn('Reset zoom error:', error);
        }
    };

    const handleClose = () => {
        resetZoom();
        onClose();
    };

    // Reset zoom when modal becomes visible
    useEffect(() => {
        if (visible) {
            resetZoom();
        }
    }, [visible]);
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.bg}>
                <View style={[styles.drawer, { backgroundColor: theme?.card || '#fff' }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme?.text || '#222' }]}>Image Preview</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={resetZoom} style={styles.resetButton}>
                                <Feather name="minimize-2" size={20} color={theme?.text || "#222"} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <Feather name="x" size={28} color={theme?.text || "#222"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.imageContainer} {...panResponder.panHandlers}>
                        {image && (
                            <Animated.Image 
                                source={{ uri: image }} 
                                style={[
                                    styles.fullImage,
                                    {
                                        transform: [
                                            { scale },
                                            { translateX },
                                            { translateY }
                                        ]
                                    }
                                ]} 
                                resizeMode="contain" 
                            />
                        )}
                    </View>
                    <Text style={[styles.instructions, { color: theme?.secondaryText || '#666' }]}>
                        Pinch to zoom • Double tap to zoom • Drag to pan • Tap reset to fit
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    bg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    drawer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
        minHeight: 740,
        maxHeight: '80%',
        alignItems: 'center',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    resetButton: {
        padding: 4,
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
    },
    imageContainer: {
        width: '100%',
        height: 500,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
    },
    fullImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    instructions: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
});