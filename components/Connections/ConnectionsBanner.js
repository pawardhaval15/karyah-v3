import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ConnectionsBanner = ({ title, subtitle, actionLabel, onAction, theme, isTablet }) => {
    return (
        <LinearGradient
            colors={[theme.primary, `${theme.primary}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.banner,
                {
                    marginHorizontal: isTablet ? 24 : 16,
                    padding: isTablet ? 24 : 20,
                    borderRadius: isTablet ? 24 : 20,
                }
            ]}
        >
            <View style={styles.textContainer}>
                <Text style={[styles.title, { fontSize: isTablet ? 28 : 22 }]}>
                    {title}
                </Text>
                <Text style={[styles.subtitle, { fontSize: isTablet ? 16 : 14 }]}>
                    {subtitle}
                </Text>
            </View>

            {actionLabel && (
                <TouchableOpacity
                    style={[styles.actionBtn, { borderRadius: isTablet ? 16 : 14 }]}
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.actionLabel, { fontSize: isTablet ? 16 : 15 }]}>
                        {actionLabel}
                    </Text>
                    <Feather name="user-plus" size={isTablet ? 20 : 18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    banner: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 16,
    },
    title: {
        color: '#fff',
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
        marginTop: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    actionLabel: {
        color: '#fff',
        fontWeight: '700',
    },
});

export default memo(ConnectionsBanner);
