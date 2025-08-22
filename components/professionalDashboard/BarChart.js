// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
// } from 'react-native';
// import { BarChart, XAxis, YAxis, Grid } from 'react-native-svg-charts';
// import * as scale from 'd3-scale';
// import { getProjectsByUserId, getProjectById } from '../../utils/project';

// export default function ProjectsSnagBarChart({ theme }) {
//   const [loading, setLoading] = useState(true);
//   const [projects, setProjects] = useState([]);
//   const [selectedBar, setSelectedBar] = useState(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         // Get all projects
//         const fetchedProjects = await getProjectsByUserId();

//         // For each project, get its details for issues array
//         const projectsWithCounts = await Promise.all(
//           fetchedProjects.map(async (proj) => {
//             try {
//               const details = await getProjectById(proj.id);
//               // Issues/snags count
//               const issuesCount = Array.isArray(details.issues) ? details.issues.length : 0;
//               return {
//                 id: proj.id,
//                 name: proj.projectName,
//                 endDate: proj.endDate,
//                 count: issuesCount,
//               };
//             } catch {
//               return {
//                 id: proj.id,
//                 name: proj.projectName,
//                 endDate: proj.endDate,
//                 count: 0,
//               };
//             }
//           })
//         );

//         setProjects(projectsWithCounts);
//       } catch (err) {
//         setProjects([]);
//       }
//       setLoading(false);
//     };
//     fetchData();
//   }, []);

//   if (loading) {
//     return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
//   }

//   if (!projects.length) {
//     return (
//       <View style={styles.messageWrap}>
//         <Text style={{ color: theme.text }}>No project data available</Text>
//       </View>
//     );
//   }

//   const counts = projects.map((p) => p.count);
//   const labels = projects.map((p) => p.name);

//   // For correct visual width with many bars, auto-sizing
//   const chartWidth = Math.max(350, projects.length * 36);

//   return (
//     <View style={[styles.card, { backgroundColor: theme.card }]}>
//       <Text style={[styles.title, { color: theme.text }]}>
//         Delayed and Upcoming Snags by Project
//       </Text>
//       <ScrollView horizontal>
//         <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
//           <YAxis
//             data={counts}
//             style={{ marginBottom: 30 }}
//             contentInset={{ top: 10, bottom: 10 }}
//             svg={{ fontSize: 12, fill: '#888' }}
//             numberOfTicks={8}
//             min={0}
//             formatLabel={(val) => val}
//           />
//           <View>
//             <BarChart
//               style={{ height: 180, width: chartWidth }}
//               data={counts}
//               svg={{ fill: '#61A0EA' }}
//               yAccessor={({ item }) => item}
//               contentInset={{ top: 10, bottom: 10 }}
//               spacingInner={0.17}
//               spacingOuter={0.15}
//               gridMin={0}
//             >
//               <Grid direction={Grid.Direction.HORIZONTAL} />
//             </BarChart>
//             <XAxis
//               data={labels}
//               scale={scale.scaleBand}
//               formatLabel={(val, idx) =>
//                 labels[idx] && labels[idx].length > 10 ? labels[idx].slice(0, 9) + '…' : labels[idx]
//               }
//               style={{
//                 marginHorizontal: -8,
//                 height: 32,
//                 width: chartWidth,
//               }}
//               svg={{
//                 fontSize: 11,
//                 fill: '#555',
//                 rotation: 40,
//                 originY: 16,
//                 y: 18,
//                 fontWeight: '600',
//               }}
//             />
//           </View>
//         </View>
//       </ScrollView>

//       {/* Modal Tooltip on Bar Press */}
//       <Modal transparent visible={!!selectedBar} animationType="fade">
//         <TouchableOpacity
//           style={styles.modalBackdrop}
//           onPress={() => setSelectedBar(null)}
//         >
//           <View style={styles.tooltipBox}>
//             <Text style={[styles.tooltipTitle, { color: theme.primary }]}>
//               {selectedBar?.name}
//             </Text>
//             <Text style={{ color: theme.text }}>
//               Snags: {selectedBar?.count}
//             </Text>
//             {selectedBar?.endDate && (
//               <Text style={{ color: theme.text }}>
//                 End Date: {selectedBar.endDate.slice(0, 10)}
//               </Text>
//             )}
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 12,
//     margin: 12,
//     borderWidth: 1,
//     borderColor: '#e6eaf3',
//     elevation: 2,
//     minHeight: 240,
//   },
//   title: {
//     fontWeight: 'bold',
//     fontSize: 16,
//     marginBottom: 8,
//     letterSpacing: 0.1,
//     marginLeft: 4,
//   },
//   messageWrap: {
//     padding: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   modalBackdrop: {
//     flex: 1,
//     backgroundColor: '#0008',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   tooltipBox: {
//     backgroundColor: '#fff',
//     padding: 18,
//     borderRadius: 10,
//     minWidth: 180,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     alignItems: 'flex-start',
//   },
//   tooltipTitle: {
//     fontWeight: 'bold',
//     fontSize: 15,
//     marginBottom: 8,
//   },
// });



import React, { useEffect, useState } from 'react';
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
import { getProjectsByUserId, getProjectById } from '../../utils/project';

export default function ProjectsSnagBarChart({ theme }) {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedBar, setSelectedBar] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchedProjects = await getProjectsByUserId();
                const projectsWithCounts = await Promise.all(
                    fetchedProjects.map(async (proj) => {
                        try {
                            const details = await getProjectById(proj.id);
                            console.log(`Project details for ID ${proj.id}:`, details);

                            // 1. Only UNRESOLVED issues
                            const issuesCount = Array.isArray(details.issues)
                                ? details.issues.filter(
                                    (issue) =>
                                        !issue.issueStatus || // no status = unresolved
                                        !['resolved', 'closed', 'done', 'completed'].includes(
                                            String(issue.issueStatus).toLowerCase()
                                        )
                                ).length
                                : 0;

                            // 2. Only INCOMPLETE tasks (progress < 100)
                            let tasks = [];
                            if (Array.isArray(details.worklists)) {
                                details.worklists.forEach((w) => {
                                    if (Array.isArray(w.tasks)) {
                                        tasks = tasks.concat(w.tasks);
                                    }
                                });
                            }
                            const incompleteTasks = tasks.filter(
                                (task) =>
                                    typeof task.progress === 'number'
                                        ? task.progress < 100
                                        : true // no progress means incomplete
                            ).length;

                            // Final count (exclude resolved issues and completed tasks)
                            const totalCount = issuesCount + incompleteTasks;


                            return {
                                id: proj.id,
                                name: proj.projectName,
                                endDate: proj.endDate,
                                count: totalCount,
                                issuesCount,
                                incompleteTasks,
                            };
                        } catch {
                            return {
                                id: proj.id,
                                name: proj.projectName,
                                endDate: proj.endDate,
                                count: 0,
                                issuesCount: 0,
                                incompleteTasks: 0,
                            };
                        }
                    })
                );
                setProjects(projectsWithCounts);
            } catch (err) {
                setProjects([]);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
    }

    if (!projects.length) {
        return (
            <View style={styles.messageWrap}>
                <Text style={{ color: theme.text }}>No project data available</Text>
            </View>
        );
    }

    const counts = projects.map((p) => p.count);
    const labels = projects.map((p) => p.name);
    // Reduce the width for smaller/thinner bars
    const chartWidth = Math.max(350, projects.length * 26); // <- Was 38

    // Inside bar: show vertical label ONLY for bars with count > 0, showing both sub-counts
    const BarLabels = ({ x, y, bandwidth, data }) =>
        data.map((value, index) => {
            if (value === 0) return null; // Skip labeling for zero count
            const isDark = theme.dark || theme.mode === 'dark';  // Adjust as per your theme structure
            const textColor = isDark ? '#fff' : '#003366';
            const barHeight = y(0) - y(value);
            const centerX = x(index) + bandwidth / 2;
            const centerY = y(value) + barHeight / 2;

            return (
                <SvgText
                    key={index}
                    x={centerX}
                    y={centerY}
                    fontSize={9}          // Smaller font size
                    fill={textColor}
                    fontWeight="600"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(-90, ${centerX}, ${centerY})`}   // Vertical rotation
                >
                    {`${projects[index].name} | ${value}`}   {/* Combined count and text */}
                </SvgText>
            );
        });

    const BarDecorator = ({ x, y, bandwidth, data }) =>
        data.map((value, index) => (
            <TouchableOpacity
                key={index}
                activeOpacity={0.6}
                onPress={() => setSelectedBar({ ...projects[index], index })}
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
                Delayed and Upcoming Projects with Unresolved Issues & Incomplete Tasks
            </Text>
            <ScrollView horizontal>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <YAxis
                        data={counts}
                        style={{ marginBottom: 30 }}
                        contentInset={{ top: 10, bottom: 10 }}
                        svg={{ fontSize: 12, fill: '#888' }}
                        numberOfTicks={8}
                        min={0}
                        formatLabel={(val) => val}
                    />
                    <View>
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
                            <Grid
                                direction={Grid.Direction.HORIZONTAL}
                                svg={{ stroke: '#000', strokeOpacity: 0.1 }}
                            />
                            <BarLabels
                                x={(i) => i * (chartWidth / counts.length)}
                                y={(val) => 180 - ((val / Math.max(...counts, 1)) * (180 - 10 - 10))}
                                bandwidth={chartWidth / counts.length}
                                data={counts}
                            />
                            <BarDecorator
                                x={(i) => i * (chartWidth / counts.length)}
                                y={(val) => 180 - ((val / Math.max(...counts, 1)) * (180 - 10 - 10))}
                                bandwidth={chartWidth / counts.length}
                                data={counts}
                            />
                        </BarChart>
                        <XAxis
                            data={labels}
                            scale={scale.scaleBand}
                            formatLabel={(val, idx) =>
                                labels[idx] && labels[idx].length > 10
                                    ? labels[idx].slice(0, 9) + '…'
                                    : labels[idx]
                            }
                            style={{
                                marginHorizontal: -8,
                                height: 50,       // increased from 32 to 50 for more vertical space
                                marginTop: 10,    // adds space between bars and labels
                                width: chartWidth,
                            }}
                            svg={{
                                fontSize: 8,
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
                        <Text style={[styles.tooltipTitle, { color: theme.primary }]}>
                            {selectedBar?.name}
                        </Text>
                        <Text style={{ color: theme.text }}>
                            Unresolved Issues: {selectedBar?.issuesCount}
                        </Text>
                        <Text style={{ color: theme.text }}>
                            Incomplete Tasks: {selectedBar?.incompleteTasks}
                        </Text>
                        <Text style={{ color: theme.text }}>
                            Total: {selectedBar?.count}
                        </Text>
                        {selectedBar?.endDate && (
                            <Text style={{ color: theme.text }}>
                                End Date: {selectedBar.endDate.slice(0, 10)}
                            </Text>
                        )}
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
        backgroundColor: '#0008',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltipBox: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 10,
        minWidth: 180,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        alignItems: 'flex-start',
    },
    tooltipTitle: {
        fontWeight: 'bold',
        fontSize: 15,
        marginBottom: 8,
    },
});


