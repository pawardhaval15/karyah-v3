import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function GradientButton({ onPress, title }) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <LinearGradient
        colors={[theme.secondary, theme.primary]}
        style={styles.button}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.buttonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});