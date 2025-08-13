import { Ionicons, Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const DUMMY_AVATAR = 'https://ui-avatars.com/api/?name=User&background=888&color=fff&size=64';

export default function CustomPickerDrawer({
    visible,
    onClose,
    data,
    valueKey = 'id',
    labelKey = 'name',
    imageKey = 'profilePhoto',
    selectedValue,
    onSelect,
    theme,
    placeholder = 'Search...',
    showImage = false,
    onAddProject, // <-- add this prop
    multiSelect = false,
}) {
    const [search, setSearch] = useState('');

    // Separate out the "Add New" item if present
    const addNewItem = data.find(item => item[valueKey] === '__add_new__');
    const filtered = data
        .filter(item =>
            item[valueKey] !== '__add_new__' &&
            item[labelKey]?.toLowerCase().includes(search.toLowerCase())
        );
    // Helper: check if an item is selected
    const isItemSelected = (item) => {
        if (multiSelect && Array.isArray(selectedValue)) {
            return selectedValue.includes(item[valueKey]);
        }
        return selectedValue === item[valueKey];
    };
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <TouchableWithoutFeedback onPress={onClose}>
                            <View style={styles.backdrop} />
                        </TouchableWithoutFeedback>

                        <View style={[
                            styles.sheet,
                            { backgroundColor: theme.card, borderTopColor: theme.border }
                        ]}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: theme.text }]}>Select</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    {addNewItem && (
                                        <TouchableOpacity
                                            style={[
                                                styles.topAddNewBtn,
                                                { borderColor: theme.border, backgroundColor: theme.secCard }
                                            ]}
                                            onPress={() => {
                                                onSelect(addNewItem[valueKey]);
                                                onClose();
                                            }}
                                        >
                                            <Ionicons name="add" size={18} color={theme.primary || '#2563eb'} />
                                            <Text style={[styles.topAddText, { color: theme.primary || '#2563eb' }]}>
                                                {addNewItem[labelKey]?.replace(/^\+ /, '') || 'Add New'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={onClose}>
                                        <Ionicons name="close" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Search */}
                            <TextInput
                                style={[
                                    styles.search,
                                    {
                                        backgroundColor: theme.secCard,
                                        color: theme.text,
                                        borderColor: theme.border,
                                    },
                                ]}
                                placeholder={placeholder}
                                placeholderTextColor={theme.secondaryText}
                                value={search}
                                onChangeText={setSearch}
                            />

                            {/* List */}
                            <FlatList
                                data={filtered}
                                keyExtractor={item => item[valueKey]?.toString()}
                                contentContainerStyle={{ paddingBottom: 80 }}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item, index }) => (
                                    <>
                                        <TouchableOpacity
                                            style={[
                                                styles.item,
                                                {
                                                    backgroundColor:
                                                        isItemSelected(item)
                                                            ? theme.secCard
                                                            : 'transparent',
                                                },
                                            ]}
                                            onPress={() => {
                                                onSelect(item[valueKey]);
                                                if (!multiSelect) {
                                                    onClose();
                                                }
                                            }}
                                        >
                                            {/* Image */}
                                            {showImage && (
                                                <Image
                                                    source={{
                                                        uri:
                                                            item[imageKey] && item[imageKey].length > 5
                                                                ? item[imageKey]
                                                                : DUMMY_AVATAR,
                                                    }}
                                                    style={styles.avatar}
                                                />
                                            )}

                                            {/* Label */}
                                            <Text
                                                style={[
                                                    styles.label,
                                                    { color: theme.text, marginLeft: showImage ? 10 : 0 },
                                                ]}
                                            >
                                                <Text style={{ color: theme.secondaryText }}>{index + 1}. </Text>
                                                {item[labelKey]}
                                            </Text>

                                            {/* Tick Icon */}
                                            {isItemSelected(item) && (
                                                <Feather
                                                    name="check-circle"
                                                    size={22}
                                                    color="#366CD9"
                                                    style={{ marginLeft: 'auto' }}
                                                />
                                            )}
                                        </TouchableOpacity>

                                        {/* Divider */}
                                        <View
                                            style={{
                                                height: 1,
                                                backgroundColor: theme.border,
                                                marginLeft: showImage ? 42 : 0,
                                                opacity: 0.5,
                                            }}
                                        />
                                    </>
                                )}
                                ListEmptyComponent={
                                    <Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 20 }}>
                                        No results found
                                    </Text>
                                }
                            />
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
const styles = StyleSheet.create({
    topAddNewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    topAddText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },

    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdrop: {
        flex: 1,
    },
    sheet: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        paddingTop: 24,
        paddingHorizontal: 20,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    search: {
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 10,
        marginTop: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 8,
        marginBottom: 2,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ccc',
    },
    stickyBtnContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        borderTopWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addNewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
});