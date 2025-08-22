// Imports (adjust path as needed)
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { BarChart, XAxis, YAxis, Grid } from 'react-native-svg-charts';
import { Text as SvgText } from 'react-native-svg';
import * as scale from 'd3-scale';
import { fetchAssignedIssues, fetchCreatedByMeIssues } from '../../utils/issues';

export default function AssignedIssuesBarChart({ theme }) {
    const [loading, setLoading] = useState(true);
    const [dataByPOC, setDataByPOC] = useState([]);
    const [selectedBar, setSelectedBar] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get logged-in user info from AsyncStorage
                const loggedInUserIdRaw = await AsyncStorage.getItem('userId');
                const loggedInUserName = await AsyncStorage.getItem('userName');

                // Normalize logged-in userId to number if possible
                const loggedInUserId = loggedInUserIdRaw
                    ? (isNaN(Number(loggedInUserIdRaw)) ? loggedInUserIdRaw : Number(loggedInUserIdRaw))
                    : null;

                // Fetch both assigned and created by me issues
                const [assignedIssues, createdByMeIssues] = await Promise.all([
                    fetchAssignedIssues(),
                    fetchCreatedByMeIssues(),
                ]);
                // console.log('✅ Assigned Issues fetched:', assignedIssues);

                // Helper to normalize issues for consistent assigned user info
                const normalizeIssues = (issues, isCreatedByMe = false) =>
                    issues.map(issue => ({
                        id: issue.issueId || issue.id,
                        status: (issue.issueStatus || '').toLowerCase(),
                        assignedUserId: isCreatedByMe ? issue.assignToUserId : issue.assignTo,
                        assignedUserName: isCreatedByMe ? issue.assignToUserName : null, // will map from ID to Name below for assignedIssues
                    }));

                const normalizedCreated = normalizeIssues(createdByMeIssues, true);
                const normalizedAssigned = normalizeIssues(assignedIssues, false);

                // Create a map from assigned user ID to name using createdByMe data (more complete)
                const userIdToName = {};
                normalizedCreated.forEach(issue => {
                    if (issue.assignedUserId && issue.assignedUserName) {
                        userIdToName[issue.assignedUserId] = issue.assignedUserName;
                    }
                });

                // For assigned issues, fill in user name from map or generate fallback name
                normalizedAssigned.forEach(issue => {
                    if (issue.assignedUserId && !userIdToName[issue.assignedUserId]) {
                        userIdToName[issue.assignedUserId] = 'User-' + issue.assignedUserId;
                    }
                });

                // Add logged-in user explicitly to userIdToName map
                if (loggedInUserId && loggedInUserName) {
                    userIdToName[loggedInUserId] = loggedInUserName;
                }

                // Filter unresolved issues helper
                const isUnresolved = (status) =>
                    !status || !['resolved', 'closed', 'done', 'completed'].includes(status);

                // Combine normalized lists filtering only unresolved
                const combinedIssues = [
                    ...normalizedCreated.filter(issue => isUnresolved(issue.status)),
                    ...normalizedAssigned.filter(issue => isUnresolved(issue.status)),
                ];

                // Group by assignedUserId counting issues
                const grouped = {};
                combinedIssues.forEach(issue => {
                    const id = issue.assignedUserId || 'Unassigned';
                    grouped[id] = (grouped[id] || 0) + 1;
                });

                // Add logged-in user with count 0 if absent
                if (loggedInUserId && !grouped[loggedInUserId]) {
                    grouped[loggedInUserId] = 0;
                }

                // Prepare chart data array
                const chartData = Object.entries(grouped).map(([userId, count]) => ({
                    userId,
                    userName: userIdToName[userId] || 'Unassigned',
                    count,
                }));

                setDataByPOC(chartData);
            } catch (err) {
                setDataByPOC([]);
                console.error('Error fetching combined issues:', err);
            }
            setLoading(false);
        };
        fetchData();
    }, []);



    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
    }

    if (!dataByPOC.length) {
        return (
            <View style={styles.messageWrap}>
                <Text style={{ color: theme.text }}>No unresolved issues found</Text>
            </View>
        );
    }

    const counts = dataByPOC.map(item => item.count);
    const labels = dataByPOC.map(item => item.userName);
    const chartWidth = Math.max(350, labels.length * 38);

    // Vertical label decorator (optional for count)
    const BarLabels = ({ x, y, bandwidth, data }) =>
        data.map((value, index) => {
            if (value === 0) return null;
            const textColor = theme.dark ? '#fff' : '#003366';
            const centerX = x(index) + bandwidth / 2;
            const centerY = y(value) + (y(0) - y(value)) / 2;

            return (
                <SvgText
                    key={index}
                    x={centerX}
                    y={centerY}
                    fontSize={10}
                    fill={textColor}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                >
                    {value}
                </SvgText>
            );
        });

    // Touchable bar decorator to open popup
    const BarDecorator = ({ x, y, bandwidth, data }) =>
        data.map((value, index) => (
            <TouchableOpacity
                key={index}
                activeOpacity={0.6}
                onPress={() => setSelectedBar({ ...dataByPOC[index], index })}
                style={{
                    position: 'absolute',
                    left: x(index),
                    top: y(value),
                    width: bandwidth,
                    height: y(0) - y(value),
                }}
            />
        ));

    return (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.title, { color: theme.text }]}>
                Delayed and Upcoming Issues by User
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    {/* YAxis with fixed width */}
                    <YAxis
                        data={counts}
                        contentInset={{ top: 10, bottom: 10 }}
                        svg={{ fontSize: 12, fill: '#888' }}
                        numberOfTicks={8}
                        min={0}
                        style={{ marginBottom: 30, width: 40 }}
                        formatLabel={(val) => val}
                    />
                    <View>
                        {/* BarChart with dynamic width */}
                        <BarChart
                            style={{ height: 180, width: chartWidth }}
                            data={counts}
                            svg={{ fill: '#61A0EA' }}
                            yAccessor={({ item }) => item}
                            contentInset={{ top: 10, bottom: 10 }}
                            spacingInner={0.25}
                            spacingOuter={0.2}
                            gridMin={0}
                        >
                            <Grid direction={Grid.Direction.HORIZONTAL} svg={{ stroke: '#000', strokeOpacity: 0.1 }} />
                            <BarLabels
                                x={(i) => i * (chartWidth / labels.length)}
                                y={(val) => 180 - ((val / Math.max(...counts, 1)) * (180 - 10 - 10))}
                                bandwidth={chartWidth / labels.length}
                                data={counts}
                            />
                            <BarDecorator
                                x={(i) => i * (chartWidth / labels.length)}
                                y={(val) => 180 - ((val / Math.max(...counts, 1)) * (180 - 10 - 10))}
                                bandwidth={chartWidth / labels.length}
                                data={counts}
                            />
                        </BarChart>

                        {/* XAxis with dynamic width matching BarChart */}
                        <XAxis
                            data={labels}
                            scale={scale.scaleBand}
                            formatLabel={(val, idx) =>
                                labels[idx] && labels[idx].length > 10 ? labels[idx].slice(0, 9) + '…' : labels[idx]
                            }
                            style={{
                                marginHorizontal: -8,
                                height: 50,
                                marginTop: 10,
                                width: chartWidth,
                            }}
                            svg={{
                                fontSize: 10,
                                fill: '#555',
                                rotation: -40,
                                originY: 16,
                                y: 18,
                                fontWeight: '600',
                            }}
                        />
                    </View>
                </View>
            </ScrollView>
            <Modal transparent visible={!!selectedBar} animationType="fade">
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    onPress={() => setSelectedBar(null)}
                >
                    <View style={styles.tooltipBox}>
                        <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }}>
                            allotted_user: <Text style={{ color: theme.primary }}>{selectedBar?.userName}</Text>
                        </Text>
                        <Text style={{ color: theme.text }}>
                            Count: <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedBar?.count}</Text>
                        </Text>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        margin: 12,
        borderWidth: 1,
        borderColor: '#e6eaf3',
        elevation: 2,
        minHeight: 240,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 10,
        marginBottom: 8,
        letterSpacing: 0.1,
        marginLeft: 4,
    },
    messageWrap: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: '#0007',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltipBox: {
        backgroundColor: '#222',
        padding: 18,
        borderRadius: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        alignItems: 'flex-start',
    },
});
