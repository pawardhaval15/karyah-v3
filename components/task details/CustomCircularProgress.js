import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

const CustomCircularProgress = ({ size = 52, strokeWidth = 4, percentage = 75 }) => {
  const radius = (size - strokeWidth - 10) / 2; // Reduce radius for a smaller circle
  const circumference = 2 * Math.PI * radius;
  
  // Ensure percentage is clamped between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  // Calculate stroke dash offset with proper handling for 100%
  const strokeDashoffset = clampedPercentage === 100 
    ? 0 
    : circumference - (clampedPercentage / 100) * circumference;
  
  const theme = useTheme();

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={theme ? theme.avatarBg : "#ECF0FF"}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={theme ? theme.primary : "#366CD9"}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={clampedPercentage === 100 ? "none" : `${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.text, { color: theme ? theme.text : "#fff" }]}>{Math.round(clampedPercentage)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default CustomCircularProgress;