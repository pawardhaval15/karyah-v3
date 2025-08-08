import { Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function FieldBox({
    label,
    subtitle,
    value,
    icon,
    onPress,
    editable = false,
    placeholder,
    rightComponent,
    multiline = false,
    inputStyle = {},
    theme // <-- add theme prop
}) {
    return (
        <View style={styles.wrapper}>
            {subtitle && <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
            <TouchableOpacity
                style={[
                    styles.fieldBox,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    multiline && styles.fieldBoxMultiline
                ]}
                activeOpacity={editable ? 0.7 : 1}
                onPress={onPress}
                disabled={!editable && !onPress}
            >
                <View style={styles.fieldContent}>
                    {label && <Text style={[styles.label, { color: theme.text }]}>{label}</Text>}
                    <View style={styles.inputRow}>
                        {icon && <View style={styles.fieldIcon}>{icon}</View>}
                        <TextInput
                            style={[
                                styles.fieldInput,
                                { color: theme.text },
                                multiline && styles.fieldInputMultiline,
                                inputStyle
                            ]}
                            value={value}
                            editable={editable}
                            placeholder={placeholder}
                            placeholderTextColor={theme.secondaryText}
                            multiline={multiline}
                        />
                        {rightComponent}
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: isTablet ? 40 : 20,
        marginBottom: isTablet ? 16 : 12,
    },
    label: {
        fontSize: isTablet ? 12 : 10,
        fontWeight: '400',
        color: '#222',
        marginBottom: isTablet ? 8 : 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: isTablet ? 16 : 14,
        textAlign: 'left',
    },
    subtitle: {
        fontSize: isTablet ? 15 : 13,
        color: '#888',
        marginBottom: isTablet ? 8 : 6,
    },
    fieldBox: {
        backgroundColor: '#fff',
        borderRadius: isTablet ? 14 : 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: isTablet ? 18 : 14,
        paddingVertical: isTablet ? 16 : 12,
    },
    fieldBoxMultiline: {
        minHeight: isTablet ? 120 : 108,
        paddingTop: isTablet ? 16 : 12,
        paddingBottom: isTablet ? 16 : 12,
    },
    fieldContent: {
        flex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fieldIcon: {
        marginRight: isTablet ? 12 : 10,
    },
    fieldInput: {
        flex: 1,
        fontSize: isTablet ? 18 : 16,
        color: '#363942',
        paddingVertical: 0,
        backgroundColor: 'transparent',
        fontWeight: '400',
    },
    fieldInputMultiline: {
        textAlignVertical: 'top',
        height: '100%',
    },
});