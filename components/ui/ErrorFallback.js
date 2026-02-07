import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ErrorFallback = ({
    error,
    resetError,
    title = "Something went wrong",
    message = "We encountered an unexpected error. Please try again or contact support if the issue persists.",
    theme
}) => {
    return (
        <View style={[styles.container, { backgroundColor: theme?.background || '#fff' }]}>
            <View style={[styles.iconContainer, { backgroundColor: (theme?.primary || '#366CD9') + '10' }]}>
                <Feather name="alert-triangle" size={48} color={theme?.primary || '#366CD9'} />
            </View>

            <Text style={[styles.title, { color: theme?.text || '#000' }]}>{title}</Text>
            <Text style={[styles.message, { color: theme?.secondaryText || '#666' }]}>{message}</Text>

            {__DEV__ && error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error.toString()}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.button, { backgroundColor: theme?.primary || '#366CD9' }]}
                onPress={resetError}
            >
                <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
    },
    errorBox: {
        padding: 12,
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FED7D7',
        width: '100%',
        marginBottom: 24,
    },
    errorText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#C53030',
    },
    button: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorFallback;
