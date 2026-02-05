import { Feather, MaterialIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const ConnectionSearchInput = ({ value, onChangeText, placeholder, theme, isTablet }) => {
    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    marginHorizontal: isTablet ? 24 : 20,
                    paddingHorizontal: isTablet ? 18 : 14,
                    height: isTablet ? 56 : 50,
                    borderRadius: isTablet ? 16 : 14,
                }
            ]}
        >
            <Feather name="search" size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
            <TextInput
                style={[
                    styles.input,
                    {
                        color: theme.text,
                        fontSize: isTablet ? 17 : 15,
                    }
                ]}
                placeholder={placeholder}
                placeholderTextColor={theme.secondaryText}
                value={value}
                onChangeText={onChangeText}
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10}>
                    <MaterialIcons name="cancel" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 0,
        fontWeight: '600',
    },
});

export default memo(ConnectionSearchInput);
