import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function FabButton({ onPress, theme }) {
    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
            <LinearGradient
                colors={[theme.secondary, theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fabCircle}>
                <Ionicons name="add" size={36} color="#fff" />
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fabCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
});