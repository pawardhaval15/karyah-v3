import { useNavigation } from '@react-navigation/native';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

function formatShortDateRange(timeline) {
  if (!timeline) return '';
  return timeline.replace(
    /January|February|March|April|May|June|July|August|September|October|November|December/gi,
    (m) => m.slice(0, 3)
  );
}

export default function ProjectProgressCard({
  title,
  timeline,
  assignedBy,
  avatars = [],
  progress,
  project,
  theme, // <-- receive theme prop
  creatorName, // <-- receive creatorName
  location

}) {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ProjectDetailsScreen', { project })}
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
        },
      ]}
      activeOpacity={0.85}
    >
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.avatarGroup}>
          {avatars
            .filter(uri => typeof uri === 'string' && uri.trim().length > 0)
            .slice(0, 3)
            .map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={[
                  styles.avatar,
                  {
                    left: idx * 13, // tighter overlap
                    zIndex: 10 - idx,
                    borderColor: theme.card,
                  },
                ]}
              />
            ))}
        </View>
        <View>
          <Text ellipsizeMode="tail" style={[styles.timeline, { color: theme.text }]}>{formatShortDateRange(timeline)}</Text>
        </View>
      </View>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.assigned, { color: theme.text }]}>
        Location: <Text style={[styles.assignedBy, { color: theme.text }]}>{location || "N/A"}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 0,
    minHeight: 18,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
    maxWidth: 120, // adjust as needed for your card width
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    width: 240,
    minHeight: 110,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
    marginTop: 2,
    width: '100%',
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 2,
    width: '100%',
  },
  timeline: {
    fontSize: 11,
    marginLeft: 0,
    flex: 1,
    color: '#888',
    textAlign: 'right',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: 70,
    height: 20,
    overflow: 'visible',
  },
  avatar: {
    width: 25,
    height: 25,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#fff',
    position: 'absolute',
    backgroundColor: '#ccc',
    left: 0,
  },
  assigned: {
    fontSize: 11,
    marginTop: 6,
    color: '#888',
  },
  assignedBy: {
    fontWeight: '500',
    color: '#444',
  },
});