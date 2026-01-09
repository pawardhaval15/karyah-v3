import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

// --- 1. Define Base Themes ---

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
  // Normal issue colors
  normalIssueBg: '#F3E5F5',
  normalIssueBorder: '#E1BEE7',
  normalIssueIconBg: '#E1BEE7',
  normalIssueText: '#7B1FA2',
  normalIssueBadgeBg: '#7B1FA2',
  normalIssueBadgeText: '#fff',
  justifyContent: 'space-between',
  width:"100%",
  alignItems: 'center',
};

const darkTheme = {
  background: '#1A1A1A',
  text: '#fff',
  secondaryText: '#aaa',
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
  danger: '#2C0B0E',
  dangerText: '#FF453A',
  // Critical UI colors
  criticalBg: '#4d1300',
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
  // Normal issue colors
  normalIssueBg: '#2A1B3D',
  normalIssueBorder: '#6B46C1',
  normalIssueIconBg: '#4C1D95',
  normalIssueText: '#A855F7',
  normalIssueBadgeBg: '#7B1FA2',
  normalIssueBadgeText: '#fff',
};

// --- 2. Add New Themes (Expanding the setup) ---

const midnightTheme = {
  ...darkTheme, // Inherit basic structure from dark
  background: '#0F172A', // Deep slate blue/black
  text: '#E2E8F0',
  secondaryText: '#94A3B8',
  card: '#1E293B',
  secCard: '#1E293B',
  avatarBg: '#334155',
  border: '#334155',
  DrawerBorder: '#334155',
  inputBox: "#1E293B",
  SearchBar: "#1E293B",
  primary: '#60A5FA', // Lighter blue for contrast
  buttonBg: "#3B82F6",
  buttonText: "#fff",
};

const solarizedTheme = {
  ...lightTheme, // Inherit structure from light
  background: '#FDF6E3', // Solarized Light Base3
  text: '#657B83', // Base00
  secondaryText: '#93A1A1', // Base1
  card: '#EEE8D5', // Base2
  secCard: '#EEE8D5',
  avatarBg: '#E0D6BC',
  border: '#D6D0C2',
  DrawerBorder: '#D6D0C2',
  inputBox: "#EEE8D5",
  SearchBar: "#EEE8D5",
  primary: '#268BD2', // Blue
  secondary: '#2AA198', // Cyan
  buttonBg: "#268BD2",
  buttonText: "#FDF6E3",
};

const draculaTheme = {
  ...darkTheme,
  background: '#282A36',
  text: '#F8F8F2',
  secondaryText: '#BD93F9', // Purple tint
  card: '#44475A',
  secCard: '#44475A',
  avatarBg: '#6272A4',
  border: '#6272A4',
  DrawerBorder: '#6272A4',
  inputBox: "#44475A",
  SearchBar: "#44475A",
  primary: '#FF79C6', // Pink
  buttonBg: "#BD93F9", // Purple
  buttonText: "#282A36",
  dangerText: '#FF5555',
};

// --- NEW CREAM THEME ---
const creamTheme = {
  ...lightTheme, // Inherit basic structure from light
  background: '#FAF3E1', // Cream/Beige
  text: '#222222', // Black/Charcoal
  secondaryText: '#5d5d5d', // Dark Grey for contrast on cream
  card: '#FFFFFF', // White cards pop nicely on cream
  secCard: '#F5E7C6', // Light Tan/Sand
  avatarBg: '#F5E7C6',
  border: '#E8DFC5', // Slightly darker cream for borders
  DrawerBorder: '#E8DFC5',
  inputBox: '#FFFFFF',
  SearchBar: '#F5E7C6', // Sand color for search bar
  primary: '#FF6D1F', // Vibrant Orange
  secondary: '#222222',
  secondaryButton: '#222222',
  buttonBg: '#FFF0E0', // Very light orange/cream mix
  buttonText: '#FF6D1F',
  danger: '#FFF5F5',
  dangerText: '#D32F2F',
};

// --- 3. Consolidate into a Map ---

// This object holds all available themes
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  midnight: midnightTheme,
  solarized: solarizedTheme,
  dracula: draculaTheme,
  cream: creamTheme, // <--- Added here
};

const ThemeContext = createContext({
  theme: lightTheme,
  colorMode: 'light',
  setColorMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  
  // Determine default mode based on system, strictly 'light' or 'dark' initially
  const defaultMode = (systemScheme === 'dark' || systemScheme === 'light') ? systemScheme : 'light';
  
  const [colorMode, setColorModeState] = useState(defaultMode);
  const [userPreference, setUserPreference] = useState(null);

  // Load user preference from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('colorMode');
        // Check if stored key exists in our themes object
        if (stored && themes[stored]) {
          setColorModeState(stored);
          setUserPreference(stored);
        } else {
          // If no pref or invalid pref, fallback to system default
          setColorModeState(defaultMode);
        }
      } catch (e) {
        console.warn("Theme loading error", e);
      }
    })();
    // eslint-disable-next-line
  }, []);

  // Update colorMode if system changes and user hasn't manually set it
  useEffect(() => {
    if (!userPreference) {
      setColorModeState(defaultMode);
    }
  }, [systemScheme, userPreference, defaultMode]);

  // Custom setter to allow user override and persist
  const setColorMode = async (mode) => {
    // Only set if it's a valid theme key
    if (themes[mode]) {
      setColorModeState(mode);
      setUserPreference(mode);
      await AsyncStorage.setItem('colorMode', mode);
    } else {
      console.warn(`Invalid theme mode selected: ${mode}`);
    }
  };

  // Dynamically select the theme object based on the mode string
  const activeTheme = themes[colorMode] || lightTheme;

  const value = useMemo(() => ({
    theme: activeTheme,
    colorMode,
    setColorMode,
  }), [activeTheme, colorMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to get the actual theme object (colors)
export function useTheme() {
  const { theme } = useContext(ThemeContext);
  return theme;
}

// Hook to get the full context (including setColorMode)
export function useThemeContext() {
  return useContext(ThemeContext);
}