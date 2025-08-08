import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageModal({ visible, image, onClose, theme }) {
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const [lastScale, setLastScale] = useState(1);
    const [lastTranslateX, setLastTranslateX] = useState(0);
    const [lastTranslateY, setLastTranslateY] = useState(0);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only allow pan if zoomed in or if it's a pinch gesture
                return lastScale > 1 || Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
            },
            onMoveShouldSetPanResponderCapture: () => false,
            onPanResponderGrant: () => {
                // Set the offset to the current values when gesture starts
                scale.setOffset(lastScale - 1);
                translateX.setOffset(lastTranslateX);
                translateY.setOffset(lastTranslateY);
                scale.setValue(1);
                translateX.setValue(0);
                translateY.setValue(0);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Handle pinch-to-zoom (when there are 2 touches)
                if (evt.nativeEvent.touches.length === 2) {
                    const touches = evt.nativeEvent.touches;
                    const distance = Math.sqrt(
                        Math.pow(touches[0].pageX - touches[1].pageX, 2) +
                        Math.pow(touches[0].pageY - touches[1].pageY, 2)
                    );
                    
                    if (!panResponder.current.initialDistance) {
                        panResponder.current.initialDistance = distance;
                    }
                    
                    const scaleValue = distance / panResponder.current.initialDistance;
                    scale.setValue(Math.max(0.5, Math.min(scaleValue, 3))); // Limit scale between 0.5x and 3x
                } else if (lastScale > 1) {
                    // Handle panning when zoomed in
                    translateX.setValue(gestureState.dx);
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: () => {
                // Reset initial distance for next pinch gesture
                panResponder.current.initialDistance = null;
                
                // Flatten the offset and update last values
                scale.flattenOffset();
                translateX.flattenOffset();
                translateY.flattenOffset();
                
                // Get current values
                const currentScale = lastScale * scale._value;
                const currentTranslateX = lastTranslateX + translateX._value;
                const currentTranslateY = lastTranslateY + translateY._value;
                
                // Constrain scale
                const constrainedScale = Math.max(1, Math.min(currentScale, 3));
                
                // Reset to fit if scale is too small
                if (constrainedScale < 1.1) {
                    Animated.parallel([
                        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
                        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
                    ]).start();
                    setLastScale(1);
                    setLastTranslateX(0);
                    setLastTranslateY(0);
                } else {
                    // Constrain translation to keep image in bounds
                    const maxTranslateX = (screenWidth * (constrainedScale - 1)) / 2;
                    const maxTranslateY = (600 * (constrainedScale - 1)) / 2; // Image height is 600
                    
                    const constrainedTranslateX = Math.max(-maxTranslateX, Math.min(currentTranslateX, maxTranslateX));
                    const constrainedTranslateY = Math.max(-maxTranslateY, Math.min(currentTranslateY, maxTranslateY));
                    
                    Animated.parallel([
                        Animated.spring(scale, { toValue: constrainedScale, useNativeDriver: true }),
                        Animated.spring(translateX, { toValue: constrainedTranslateX, useNativeDriver: true }),
                        Animated.spring(translateY, { toValue: constrainedTranslateY, useNativeDriver: true }),
                    ]).start();
                    
                    setLastScale(constrainedScale);
                    setLastTranslateX(constrainedTranslateX);
                    setLastTranslateY(constrainedTranslateY);
                }
            },
        })
    ).current;

    const resetZoom = () => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        setLastScale(1);
        setLastTranslateX(0);
        setLastTranslateY(0);
    };

    const handleClose = () => {
        resetZoom();
        onClose();
    };
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
                        Pinch to zoom • Drag to pan • Tap reset to fit
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