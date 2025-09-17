import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TagsInput({
  tags,
  onTagsChange,
  theme,
  placeholder = "Add tags...",
  maxTags = 10,
}) {
  const [inputText, setInputText] = useState('');

  const addTag = () => {
    if (!inputText.trim()) return;

    // Split by comma and process each tag
    const newTags = inputText
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && !tags.includes(tag));

    if (newTags.length === 0) {
      setInputText('');
      return;
    }

    // Check max tags limit
    if (tags.length + newTags.length > maxTags) {
      Alert.alert(`Maximum ${maxTags} tags allowed`);
      return;
    }

    // Add all new tags
    onTagsChange([...tags, ...newTags]);
    setInputText('');
  };

  const handleTextChange = (text) => {
    // If user types comma, auto-add the tag
    if (text.endsWith(',')) {
      const tagToAdd = text.slice(0, -1).trim();
      if (tagToAdd) {
        const newTag = tagToAdd.toLowerCase();
        if (!tags.includes(newTag)) {
          if (tags.length >= maxTags) {
            Alert.alert(`Maximum ${maxTags} tags allowed`);
            return;
          }
          onTagsChange([...tags, newTag]);
        }
      }
      setInputText('');
    } else {
      setInputText(text);
    }
  };

  const removeTag = (tagToRemove) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' || nativeEvent.key === ',') {
      addTag();
    }
  };

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.SearchBar }]}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScrollView}
          contentContainerStyle={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View
              key={index}
              style={[
                styles.tagChip,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}>
              <Text style={[styles.tagText, { color: '#ffffff' }]}>
                #{tag}
              </Text>
              <TouchableOpacity
                onPress={() => removeTag(tag)}
                style={styles.removeButton}>
                <MaterialIcons name="close" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={inputText}
          onChangeText={handleTextChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor={theme.secondaryText}
          returnKeyType="done"
          onSubmitEditing={addTag}
          maxLength={50}
        />
        <TouchableOpacity
          onPress={addTag}
          style={[
            styles.addButton,
            {
              backgroundColor: inputText.trim() ? theme.primary : theme.border,
              opacity: inputText.trim() ? 1 : 0.5,
            },
          ]}
          disabled={!inputText.trim()}>
          <MaterialIcons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Helper Text */}
      <Text style={[styles.helperText, { color: theme.secondaryText }]}>
        Type and press comma, Enter, or + to add tag ({tags.length}/{maxTags})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 0,
    marginBottom: 0,
    padding: 12,
  },
  tagsScrollView: {
    maxHeight: 40,
    marginBottom: 8,
  },
  tagsContainer: {
    alignItems: 'center',
    paddingRight: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    maxWidth: 100,
    minHeight: 26, // Ensure minimum height
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600', // Bolder text for better visibility
    marginRight: 4,
    flex: 1,
  },
  removeButton: {
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
