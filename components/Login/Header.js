import { StyleSheet, Text, View } from 'react-native';

export default function Header({ style }) {
  return (
    <View style={[styles.header, style]}>
      <Text style={styles.headerTitle}>KARYAH:</Text>
      <Text style={styles.headerSubtitle}>|| Sarvgun Sampann ||</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 46,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 0,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});