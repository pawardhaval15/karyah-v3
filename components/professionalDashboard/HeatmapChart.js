import { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

export default function HeatmapChart({ theme, data, type = 'projects' }) {
    const [loading, setLoading] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
    }

    if (!data?.length) {
        return (
            <View style={styles.messageWrap}>
                <Text style={{ color: theme.text }}>No data available for heatmap</Text>
            </View>
        );
    }

    // Get intensity for color mapping
    const getIntensity = (value, maxValue) => {
        if (maxValue === 0) return 0;
        return Math.min(value / maxValue, 1);
    };

    // Get color based on intensity
    const getHeatmapColor = (intensity) => {
        if (intensity === 0) return theme.card;
        if (intensity <= 0.25) return '#DBEAFE'; // Very light blue
        if (intensity <= 0.5) return '#93C5FD'; // Light blue
        if (intensity <= 0.75) return '#3B82F6'; // Medium blue
        return '#1D4ED8'; // Dark blue
    };

    const maxValue = Math.max(...data.map(item => item.count));
    const cellSize = Math.min((screenWidth - 64) / Math.ceil(Math.sqrt(data.length)), 80);

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <Ionicons name="grid" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.titleContent}>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {type === 'projects' ? 'Project Heat Map' : 'Issues Heat Map'}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                            intensity by {type === 'projects' ? 'project' : 'team member'}
                        </Text>
                    </View>
                    <View style={[styles.totalBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.totalText}>
                            {data.reduce((sum, item) => sum + item.count, 0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <Text style={[styles.legendText, { color: theme.secondaryText }]}>Less</Text>
                <View style={styles.legendScale}>
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.legendCell,
                                { backgroundColor: getHeatmapColor(intensity) }
                            ]}
                        />
                    ))}
                </View>
                <Text style={[styles.legendText, { color: theme.secondaryText }]}>More</Text>
            </View>

            {/* Heatmap Grid */}
            <View style={styles.heatmapContainer}>
                <View style={styles.heatmapGrid}>
                    {data.map((item, index) => {
                        const intensity = getIntensity(item.count, maxValue);
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.heatmapCell,
                                    {
                                        backgroundColor: getHeatmapColor(intensity),
                                        width: cellSize,
                                        height: cellSize,
                                        borderColor: theme.border,
                                    }
                                ]}
                                onPress={() => setSelectedCell(item)}
                            >
                                <Text style={[
                                    styles.cellLabel,
                                    { 
                                        color: intensity > 0.5 ? '#fff' : theme.text,
                                        fontSize: Math.min(cellSize / 8, 10)
                                    }
                                ]}>
                                    {item.name ? item.name.slice(0, 2).toUpperCase() : 
                                     item.userName ? item.userName.slice(0, 2).toUpperCase() : '??'}
                                </Text>
                                <Text style={[
                                    styles.cellValue,
                                    { 
                                        color: intensity > 0.5 ? '#fff' : theme.text,
                                        fontSize: Math.min(cellSize / 6, 12)
                                    }
                                ]}>
                                    {item.count}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Modal for cell details */}
            <Modal transparent visible={!!selectedCell} animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setSelectedCell(null)}
                >
                    <View style={[styles.modal, { 
                        backgroundColor: theme.card, 
                        borderColor: theme.border 
                    }]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIcon, { 
                                backgroundColor: getHeatmapColor(
                                    getIntensity(selectedCell?.count || 0, maxValue)
                                )
                            }]}>
                                <Ionicons 
                                    name={type === 'projects' ? "construct" : "person"} 
                                    size={20} 
                                    color="#fff" 
                                />
                            </View>
                            <View style={styles.modalDetails}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>
                                    {selectedCell?.name || selectedCell?.userName}
                                </Text>
                                <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
                                    {type === 'projects' ? 'Project Details' : 'Team Member'}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setSelectedCell(null)}
                                style={styles.closeBtn}
                            >
                                <Ionicons name="close" size={18} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalContent}>
                            <View style={[styles.countBox, { 
                                backgroundColor: `${getHeatmapColor(
                                    getIntensity(selectedCell?.count || 0, maxValue)
                                )}20` 
                            }]}>
                                <Text style={[styles.countNumber, { 
                                    color: getHeatmapColor(
                                        getIntensity(selectedCell?.count || 0, maxValue)
                                    )
                                }]}>
                                    {selectedCell?.count || 0}
                                </Text>
                                <Text style={[styles.countLabel, { color: theme.secondaryText }]}>
                                    {type === 'projects' ? 'Total Issues & Tasks' : 'Unresolved Issues'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        minHeight: 300,
    },
    header: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleContent: {
        flex: 1,
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        lineHeight: 20,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
    },
    totalBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    totalText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    legendScale: {
        flexDirection: 'row',
        marginHorizontal: 12,
    },
    legendCell: {
        width: 16,
        height: 16,
        marginHorizontal: 1,
        borderRadius: 2,
    },
    heatmapContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heatmapGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heatmapCell: {
        margin: 2,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    cellLabel: {
        fontWeight: '600',
        textAlign: 'center',
    },
    cellValue: {
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 2,
    },
    messageWrap: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modal: {
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 280,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalDetails: {
        flex: 1,
    },
    modalTitle: {
        fontWeight: '600',
        fontSize: 15,
        lineHeight: 18,
    },
    modalSubtitle: {
        fontSize: 12,
        marginTop: 1,
        opacity: 0.7,
    },
    closeBtn: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        alignItems: 'center',
    },
    countBox: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '100%',
    },
    countNumber: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
        marginBottom: 4,
    },
    countLabel: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
    },
});
