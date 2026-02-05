import { MaterialIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const ConnectionCard = ({
    item,
    theme,
    isTablet,
    onSelect,
    isRevealed,
    onToggleVisibility,
    formattedPhone,
    t
}) => {
    return (
        <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={{ width: isTablet ? '32%' : '100%' }}
        >
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        marginBottom: isTablet ? 20 : 12,
                        padding: isTablet ? 18 : 14,
                        borderRadius: isTablet ? 20 : 16,
                    },
                ]}
                onPress={() => onSelect(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
                    <Image
                        source={{ uri: item.profilePhoto || 'https://via.placeholder.com/48' }}
                        style={styles.avatar}
                    />
                </View>

                <View style={styles.content}>
                    <Text style={[styles.name, { color: theme.text, fontSize: isTablet ? 18 : 16 }]} numberOfLines={1}>
                        {item.name}
                    </Text>

                    {item.phone && (
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                onToggleVisibility(item.connectionId);
                            }}
                            activeOpacity={0.7}
                            style={styles.phoneContainer}
                        >
                            <Text style={[styles.phoneText, { color: theme.secondaryText, fontSize: isTablet ? 14 : 13 }]}>
                                {formattedPhone}
                            </Text>
                            <MaterialIcons
                                name={isRevealed ? 'visibility-off' : 'visibility'}
                                size={isTablet ? 18 : 16}
                                color={theme.secondaryText}
                                style={{ marginLeft: 6 }}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <MaterialIcons name="chevron-right" size={24} color={theme.border} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 18,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginRight: 16,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
    },
    name: {
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    phoneText: {
        fontWeight: '500',
    },
});

export default memo(ConnectionCard);
