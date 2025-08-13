import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

const lightTheme = {
  background: '#fff',
  text: '#222',
  secondaryText: '#888',
  card: '#fff',
  secCard: '#F8F9FB',
  avatarBg: '#F8F9FB',
  secondary: '#011F53',
  secondaryButton: '#011F53',
  primary: '#366CD9',
  buttonText: "#366CD9",
  buttonBg: "#EDF3FF",
  border: '#e6eaf3',
  DrawerBorder: '#e6eaf3',
  inputBox: "#fff",
  SearchBar: "#f7f7f7",
  danger: '#FFFAFA',
  dangerText: '#C6381E',
  // Critical UI colors
  criticalBg: '#FEF2F2',
  criticalBorder: '#FF7D66',
  criticalIconBg: '#FEC8BE',
  criticalText: '#FF2700',
  criticalBadgeBg: '#FF2700',
  criticalBadgeText: '#fff',
  normalBg: '#F0F9FF',
  normalBorder: '#E0F2FE',
  normalIconBg: '#DBEAFE',
  normalText: '#3B82F6',
  normalBadgeBg: '#3B82F6',
  normalBadgeText: '#fff',
  justifyContent: 'space-between',
  width:"100%",
  alignItems: 'center',
};

const darkTheme = {
  background: '#1A1A1A',
  text: '#fff',
  secondaryText: '#888',
  secCard: '#222222',
  avatarBg: '#313131',
  card: '#222222',
  primary: '#366CD9',
  buttonBg: "#366CD9",
  buttonText: "#fff",
  secondary: '#011F53',
  secondaryButton: '#fff',
  border: '#313131',
  inputBox: "#313131",
  DrawerBorder: '#6C6C6C',
  SearchBar: "#222222",
  danger: '#FFFAFA',
  dangerText: '#C6381E',
  // Critical UI colors
  criticalBg: '#FFEDFA',
  criticalBorder: '#FF7D66',
  criticalIconBg: '#FFD8D8',
  criticalText: '#FF2700',
  criticalBadgeBg: '#FF2700',
  criticalBadgeText: '#ffffff',
  normalBg: '#112233',
  normalBorder: '#366CD9',
  normalIconBg: '#1A2233',
  normalText: '#3B82F6',
  normalBadgeBg: '#3B82F6',
  normalBadgeText: '#fff',
};

const ThemeContext = createContext({
  theme: lightTheme,
  colorMode: 'light',
  setColorMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState(systemScheme || 'light');
  const [userPreference, setUserPreference] = useState(null); // null = not set by user

  // Load user preference from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('colorMode');
      if (stored === 'dark' || stored === 'light') {
        setColorModeState(stored);
        setUserPreference(stored);
      } else {
        setColorModeState(systemScheme || 'light');
      }
    })();
    // eslint-disable-next-line
  }, []);

  // Update colorMode if system changes and user hasn't manually set it
  useEffect(() => {
    if (!userPreference) {
      setColorModeState(systemScheme || 'light');
    }
  }, [systemScheme, userPreference]);

  // Custom setter to allow user override and persist
  const setColorMode = async (mode) => {
    setColorModeState(mode);
    setUserPreference(mode);
    await AsyncStorage.setItem('colorMode', mode);
  };

  const theme = colorMode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(() => ({
    theme,
    colorMode,
    setColorMode,
  }), [theme, colorMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const { theme } = useContext(ThemeContext);
  return theme;
}

// This is what you want in your CustomDrawer:
export function useThemeContext() {
  return useContext(ThemeContext);
}