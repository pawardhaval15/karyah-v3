import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProjectSearchBar({ value, onChange, theme }) {
  return (
    <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
      <TextInput
        style={[styles.searchInput, { color: theme.text }]}
        placeholder="Search project"
        placeholderTextColor={theme.secondaryText}
        value={value}
        onChangeText={onChange}
      />
      {/* <Ionicons name="search" size={22} color={theme.text} style={styles.searchIcon} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#363942',
    paddingVertical: 0,
  },
  searchIcon: {
    marginLeft: 8,
  },
});