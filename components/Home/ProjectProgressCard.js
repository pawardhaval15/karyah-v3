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
      <View style={styles.titleTimelineRow}>
        <Text
          style={[styles.title, { color: theme.text, flex: 1 }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>

        <View style={styles.locationRow}>
          <Feather
            name="map-pin"
            size={13}
            color={theme.text}
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.locationText, { color: theme.text }]}
          >
            {location || "N/A"}
          </Text>
        </View>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.avatarGroup}>
          {avatars
            .filter(uri => typeof uri === 'string' && uri.trim().length > 0)
            .slice(0, 4)
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
        <Text
          ellipsizeMode="tail"
          style={[styles.timeline, { color: theme.text, marginLeft: 10, flexShrink: 1 }]}
          numberOfLines={1}
        >
          {formatShortDateRange(timeline)}
        </Text>
      </View>


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
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
    maxWidth: 120, // adjust as needed for your card width
  },
  titleTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4, // or your preferred spacing
    width: '100%',
  },

  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    width: 240,
    minHeight: 80,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '500',
    fontSize: 16,
    marginBottom: 4,
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
    fontSize: 10,
    marginLeft: 0,
    flex: 1,
    color: '#888',
    textAlign: 'right',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: 60,
    height: 15,
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