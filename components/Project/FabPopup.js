import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function FabPopup({ onTask, onProject, theme }) {
    return (
        <View style={styles.popupContainer}>
            <View style={[styles.popupBox, { backgroundColor: theme.secCard }]}>
                <TouchableOpacity style={styles.popupBtn} onPress={onTask}>
                    <Text style={[styles.popupText, { color: theme.text }]}>Task</Text>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <TouchableOpacity style={styles.popupBtn} onPress={onProject}>
                    <Text style={[styles.popupText, { color: theme.text }]}>Project</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.popupArrowDown, { borderTopColor: theme.secCard }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    popupContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    popupBox: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        minWidth: 170,
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupText: {
        color: '#222',
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 32,
        backgroundColor: '#eee',
    },
    popupArrowDown: {
        width: 0,
        height: 0,
        borderLeftWidth: 12,
        borderRightWidth: 12,
        borderTopWidth: 12,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff',
        marginTop: -2,
        zIndex: 2,
    },
});