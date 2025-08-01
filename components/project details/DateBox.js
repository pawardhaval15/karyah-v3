import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function DateBox({ label, value, theme }) {
    const parsedDate = value ? new Date(value) : new Date();

    return (
        <View style={styles.centeredWrapper}>
            <View style={[styles.dateBox, { backgroundColor: theme.secCard, borderWidth: 1, borderColor: theme.inputBox }]} onPress={() => setShow(true)}>
                <Ionicons name="calendar-outline" size={20} color={theme.text} style={{ marginRight: 6 }} />
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.dateLabel, { color: theme.secondaryText }]}>{label}</Text>
                    <Text style={[styles.dateValue, { color: theme.text }]}>
                        {parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    centeredWrapper: {
        width: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 60,
        backgroundColor: '#F8F9FB',
        borderRadius: 10,
        padding: 12,
        marginRight: 8,
        justifyContent: 'center',
        minWidth: 100,
        width: '100%',
    },
    dateLabel: {
        color: '#888',
        fontSize: 12,
        textAlign: 'center',
    },
    dateValue: {
        color: '#222',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});