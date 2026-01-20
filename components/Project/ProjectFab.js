import { useTheme } from '../../theme/ThemeContext';

export default function ProjectFab({ onTaskPress, onProjectPress }) {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    return (
        <View style={styles.fabContainer}>
            {open && (
                <View style={styles.popupContainer}>
                    <View style={[styles.popupBox, { backgroundColor: theme.card }]}>
                        <TouchableOpacity style={styles.popupBtn} onPress={() => { setOpen(false); onTaskPress && onTaskPress(); }}>
                            <Text style={[styles.popupText, { color: theme.text }]}>Task</Text>
                        </TouchableOpacity>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <TouchableOpacity style={styles.popupBtn} onPress={() => { setOpen(false); onProjectPress && onProjectPress(); }}>
                            <Text style={[styles.popupText, { color: theme.text }]}>Project</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.popupArrowDown, { borderTopColor: theme.card }]} />
                </View>
            )}
            <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(!open)}>
                <LinearGradient
                    colors={[theme.secondary, theme.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fabCircle}>
                    <Ionicons name="add" size={36} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        zIndex: 10,
        position: 'absolute',
        bottom: 25,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: 20,
        backgroundColor: 'transparent',
    },
    fabCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupContainer: {
        alignItems: 'center',
        marginBottom: 10,
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
    popupBox: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 0,
        paddingVertical: 0,
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
});