import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { materialRequestAPI } from '../../utils/materialRequests';

export default function MaterialRequestPopup({ visible, onClose, taskId, projectId, theme }) {
  const [activeTab, setActiveTab] = useState(taskId ? 'submit' : 'view'); // 'submit' or 'view
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Reference for scrolling to new items
  const scrollViewRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Form state for new request
  const [formData, setFormData] = useState({
    items: [
      {
        itemName: '',
        quantityRequested: '',
        unit: 'pcs',
      },
    ],
  });

  const units = ['pcs', 'kg', 'ltr', 'm', 'box', 'bag', 'ton', 'ft', 'sqm', 'cum'];

  useEffect(() => {
    if (visible && activeTab === 'view') {
      fetchRequests();
    }
  }, [visible, activeTab, taskId, projectId]);

  // Update activeTab when taskId changes
  useEffect(() => {
    setActiveTab(taskId ? 'submit' : 'view');
  }, [taskId]);

  // Smart Search logic with enhanced matching
  useEffect(() => {
    let filtered = [...requests];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchTerms = query.split(' ').filter((term) => term.length > 0);

      filtered = filtered.filter((request) => {
        // Create searchable text from all relevant fields
        const searchableText = [
          request.id,
          request.Task?.name || '',
          request.User?.name || '',
          request.status,
          request.remarks || '',
          ...(request.requestedItems?.map((item) => item.itemName) || []),
        ]
          .join(' ')
          .toLowerCase();

        // Check if all search terms are found (AND logic)
        return searchTerms.every((term) => searchableText.includes(term));
      });

      // Sort results by relevance (exact matches first, then partial matches)
      filtered.sort((a, b) => {
        const aSearchableText = [
          a.id,
          a.Task?.name || '',
          a.User?.name || '',
          a.status,
          ...(a.requestedItems?.map((item) => item.itemName) || []),
        ]
          .join(' ')
          .toLowerCase();

        const bSearchableText = [
          b.id,
          b.Task?.name || '',
          b.User?.name || '',
          b.status,
          ...(b.requestedItems?.map((item) => item.itemName) || []),
        ]
          .join(' ')
          .toLowerCase();

        // Prioritize exact matches at word boundaries
        const aExactMatch = searchTerms.some((term) => aSearchableText.includes(term));
        const bExactMatch = searchTerms.some((term) => bSearchableText.includes(term));

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Then sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    setFilteredRequests(filtered);
  }, [requests, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const fetchRequests = async () => {
    if (!taskId && !projectId) return;

    setLoading(true);
    let result;
    
    // If we have a taskId, fetch requests for that specific task
    // If we have projectId but no taskId, fetch all requests for the project
    if (taskId) {
      result = await materialRequestAPI.getProjectRequests(taskId);
    } else if (projectId) {
      result = await materialRequestAPI.getProjectTaskRequests(projectId);
    }

    if (result && result.success) {
      setRequests(result.data);
    } else {
      Alert.alert('Error', result?.error || 'Failed to fetch requests');
    }
    setLoading(false);
  };

  const submitRequest = async () => {
    const validItems = formData.items.filter(
      (item) => item.itemName.trim() && item.quantityRequested.trim()
    );

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item with name and quantity');
      return;
    }

    setLoading(true);
    const requestData = {
      taskId,
      requestedItems: validItems.map((item) => ({
        itemName: item.itemName.trim(),
        quantityRequested: parseFloat(item.quantityRequested),
        unit: item.unit,
      })),
    };

    const result = await materialRequestAPI.createRequest(requestData);

    if (result.success) {
      Alert.alert('Success', 'Material request submitted successfully');
      resetForm();
      setActiveTab('view');
      fetchRequests();
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      items: [
        {
          itemName: '',
          quantityRequested: '',
          unit: 'pcs',
        },
      ],
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: '',
          quantityRequested: '',
          unit: 'pcs',
        },
      ],
    }));
    
    // Auto-scroll to the new item after a brief delay
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const addMultipleItems = (count) => {
    const newItems = Array(count).fill(null).map(() => ({
      itemName: '',
      quantityRequested: '',
      unit: 'pcs',
    }));
    
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }));
    
    // Auto-scroll to the new items after a brief delay
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const duplicateItem = (index) => {
    const itemToDuplicate = { ...formData.items[index] };
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items.slice(0, index + 1),
        itemToDuplicate,
        ...prev.items.slice(index + 1),
      ],
    }));
    
    // Auto-scroll to show the duplicated item
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const renderRequestDetails = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.detailsOverlay}>
          <View style={[styles.detailsContainer, { backgroundColor: theme.background }]}>
            {/* Details Header */}
            <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.backBtn}>
                <Feather name="arrow-left" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.detailsTitle, { color: theme.text }]}>Request Details</Text>
              <View style={{ width: 20 }} />
            </View>

            <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
              {/* Request Info */}
              <View
                style={[
                  styles.detailsSection,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
                  Request Information
                </Text>

                <View style={styles.detailsRow}>
                  <Text style={[styles.detailsLabel, { color: theme.secondaryText }]}>
                    Request ID:
                  </Text>
                  <Text style={[styles.detailsValue, { color: theme.text }]}>
                    #{selectedRequest.id.slice(-8)}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={[styles.detailsLabel, { color: theme.secondaryText }]}>Task:</Text>
                  <Text style={[styles.detailsValue, { color: theme.text }]}>
                    {selectedRequest.Task?.name || 'Unknown Task'}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={[styles.detailsLabel, { color: theme.secondaryText }]}>
                    Requested by:
                  </Text>
                  <Text style={[styles.detailsValue, { color: theme.text }]}>
                    {selectedRequest.User?.name || 'Unknown User'}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={[styles.detailsLabel, { color: theme.secondaryText }]}>Date:</Text>
                  <Text style={[styles.detailsValue, { color: theme.text }]}>
                    {new Date(selectedRequest.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={[styles.detailsLabel, { color: theme.secondaryText }]}>Status:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(selectedRequest.status) + '20' },
                    ]}>
                    <Feather
                      name={getStatusIcon(selectedRequest.status)}
                      size={12}
                      color={getStatusColor(selectedRequest.status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(selectedRequest.status) },
                      ]}>
                      {selectedRequest.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Requested Items */}
              <View
                style={[
                  styles.detailsSection,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
                  Requested Items
                </Text>

                {selectedRequest.requestedItems?.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.detailsItemCard,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}>
                    <View style={styles.detailsItemHeader}>
                      <Text style={[styles.detailsItemName, { color: theme.text }]}>
                        {item.itemName}
                      </Text>
                      <Text style={[styles.detailsItemQty, { color: theme.primary }]}>
                        {item.quantityRequested} {item.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Additional Details */}
              {selectedRequest.remarks && (
                <View
                  style={[
                    styles.detailsSection,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>Remarks</Text>
                  <Text style={[styles.detailsRemarks, { color: theme.secondaryText }]}>
                    {selectedRequest.remarks}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
      
      // If we removed the last item and there are still items, scroll to show the new last item
      setTimeout(() => {
        if (scrollViewRef.current && index === formData.items.length - 1 && formData.items.length > 1) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'issued':
        return '#2196F3';
      case 'purchased':
        return '#9C27B0';
      default:
        return theme.secondaryText;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock';
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'x-circle';
      case 'issued':
        return 'package';
      case 'purchased':
        return 'shopping-cart';
      default:
        return 'help-circle';
    }
  };

  const renderRequestItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.elegantRequestCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      activeOpacity={0.7}
      onPress={() => {
        setSelectedRequest(item);
        setShowDetails(true);
      }}>
      {/* Elegant Card Header */}
      <View style={styles.elegantCardHeader}>
        <View style={styles.cardLeftSection}>
          <View style={[styles.requestIdContainer, { backgroundColor: theme.primary + '10' }]}>
            <Text style={[styles.elegantRequestId, { color: theme.primary }]}>
              #{item.id.slice(-6)}
            </Text>
          </View>
          <View
            style={[styles.elegantStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Feather name={getStatusIcon(item.status)} size={10} color="#fff" />
            <Text style={styles.elegantStatusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.elegantMoreBtn, { backgroundColor: theme.background }]}>
          <Feather name="more-horizontal" size={16} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Task and User Information */}
      <View style={styles.elegantCardContent}>
        <Text style={[styles.elegantTaskName, { color: theme.text }]} numberOfLines={1}>
          {item.Task?.name || 'Unknown Task'}
        </Text>
        <View style={styles.userInfoRow}>
          <View style={[styles.userAvatar, { backgroundColor: theme.primary + '20' }]}>
            <Feather name="user" size={10} color={theme.primary} />
          </View>
          <Text style={[styles.elegantUserName, { color: theme.secondaryText }]} numberOfLines={1}>
            {item.User?.name || 'Unknown User'}
          </Text>
        </View>
      </View>

      {/* Elegant Items Display */}
      <View style={styles.elegantItemsContainer}>
        <Text style={[styles.itemsLabel, { color: theme.secondaryText }]}>
          Materials Requested:
        </Text>
        <View style={styles.elegantItemsGrid}>
          {item.requestedItems?.slice(0, 2).map((reqItem, index) => (
            <View
              key={index}
              style={[
                styles.elegantItemChip,
                { backgroundColor: theme.primary + '08', borderColor: theme.primary + '20' },
              ]}>
              <View style={[styles.itemIconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Feather name="package" size={8} color={theme.primary} />
              </View>
              <View style={styles.itemDetails}>
                <Text style={[styles.elegantItemName, { color: theme.text }]} numberOfLines={1}>
                  {reqItem.itemName}
                </Text>
                <Text style={[styles.elegantItemQty, { color: theme.primary }]}>
                  {reqItem.quantityRequested} {reqItem.unit}
                </Text>
              </View>
            </View>
          ))}
          {item.requestedItems?.length > 2 && (
            <View
              style={[
                styles.elegantMoreItemsChip,
                {
                  backgroundColor: theme.secondaryText + '10',
                  borderColor: theme.border,
                },
              ]}>
              <Feather name="plus" size={12} color={theme.secondaryText} />
              <Text style={[styles.elegantMoreItemsText, { color: theme.secondaryText }]}>
                {item.requestedItems.length - 2} more items
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Elegant Footer */}
      <View style={[styles.elegantCardFooter, { borderTopColor: theme.border }]}>
        <View style={styles.dateContainer}>
          <Feather name="calendar" size={12} color={theme.secondaryText} />
          <Text style={[styles.elegantDate, { color: theme.secondaryText }]}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.elegantActionIndicator, { backgroundColor: theme.primary + '10' }]}>
          <Feather name="arrow-right" size={14} color={theme.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Feather name="package" size={20} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>
                {taskId ? 'Material Request' : 'Project Material Requests'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Elegant Tabs */}
          <View style={[styles.elegantTabContainer, { backgroundColor: theme.background }]}>
            {/* Only show Add Request tab if taskId is provided */}
            {taskId && (
              <TouchableOpacity
                style={[
                  styles.elegantTab,
                  activeTab === 'submit' && {
                    backgroundColor: theme.primary,                  
                  },
                ]}
                onPress={() => setActiveTab('submit')}>
                <View
                  style={[
                    styles.tabIconContainer,
                    {
                      backgroundColor: activeTab === 'submit' ? 'rgba(255,255,255,0.2)' : theme.card,
                    },
                  ]}>
                  <Feather
                    name="plus"
                    size={18}
                    color={activeTab === 'submit' ? '#fff' : theme.primary}
                  />
                </View>
                <View style={styles.tabContent}>
                  <Text
                    style={[
                      styles.elegantTabTitle,
                      { color: activeTab === 'submit' ? '#fff' : theme.text },
                    ]}>
                    Add Request
                  </Text>
                  <Text
                    style={[
                      styles.elegantTabSubtitle,
                      {
                        color: activeTab === 'submit' ? 'rgba(255,255,255,0.8)' : theme.secondaryText,
                      },
                    ]}>
                    Create new material request
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.elegantTab,
                activeTab === 'view' && {
                  backgroundColor: theme.primary,
                  elevation: 8,
                },
                // If no taskId, make this tab full width
                !taskId && { flex: 1 }
              ]}
              onPress={() => setActiveTab('view')}>
              <View
                style={[
                  styles.tabIconContainer,
                  { backgroundColor: activeTab === 'view' ? 'rgba(255,255,255,0.2)' : theme.card },
                ]}>
                <Feather
                  name="list"
                  size={14}
                  color={activeTab === 'view' ? '#fff' : theme.primary}
                />
              </View>
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.elegantTabTitle,
                    { color: activeTab === 'view' ? '#fff' : theme.text },
                  ]}>
                  {taskId ? 'View Requests' : 'Material Requests'}
                </Text>
                <Text
                  style={[
                    styles.elegantTabSubtitle,
                    { color: activeTab === 'view' ? 'rgba(255,255,255,0.8)' : theme.secondaryText },
                  ]}>
                  {taskId ? 'Browse all material requests' : 'View all project material requests'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTab === 'submit' ? (
              <View style={styles.formWrapper}>
                {/* Header Section with Title and Counter */}
                <View style={[styles.formHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.formHeaderContent}>
                    <View style={styles.formTitleSection}>
                      <Text style={[styles.formTitle, { color: theme.text }]}>Material Items</Text>
                      <View style={[styles.itemCounter, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.itemCounterText, { color: theme.primary }]}>
                          {formData.items.length} {formData.items.length === 1 ? 'item' : 'items'}
                        </Text>
                        {formData.items.length > 3 && (
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                'Clear All Items',
                                'Are you sure you want to remove all items? This action cannot be undone.',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { 
                                    text: 'Clear All', 
                                    style: 'destructive',
                                    onPress: () => setFormData({ items: [{ itemName: '', quantityRequested: '', unit: 'pcs' }] })
                                  }
                                ]
                              );
                            }}
                            style={[styles.clearAllBtn, { backgroundColor: '#F44336' + '15' }]}>
                            <Feather name="trash-2" size={10} color="#F44336" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={styles.addButtonGroup}>
                      <TouchableOpacity
                        onPress={addItem}
                        style={[styles.stickyAddBtn, { backgroundColor: theme.primary }]}>
                        <Feather name="plus" size={16} color="#fff" />
                        <Text style={styles.stickyAddBtnText}>Add Item</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Add Multiple Items',
                            'How many items would you like to add?',
                            [
                              { text: '3 items', onPress: () => addMultipleItems(3) },
                              { text: '5 items', onPress: () => addMultipleItems(5) },
                              { text: '10 items', onPress: () => addMultipleItems(10) },
                              { text: 'Cancel', style: 'cancel' }
                            ]
                          );
                        }}
                        style={[styles.quickAddBtn, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
                        <Feather name="layers" size={14} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Scrollable Items Section */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.itemsScrollView}
                  contentContainerStyle={styles.itemsScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  onScroll={() => setShowScrollIndicator(formData.items.length > 5)}
                  scrollEventThrottle={16}>
                  {formData.items.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.itemCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        index === formData.items.length - 1 && styles.lastItemCard
                      ]}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemNumberContainer}>
                          <Text style={[styles.itemNumber, { color: theme.primary }]}>
                            #{index + 1}
                          </Text>
                        </View>
                        <View style={styles.itemActions}>
                          {/* Duplicate Item Button */}
                          <TouchableOpacity
                            onPress={() => duplicateItem(index)}
                            style={[styles.duplicateItemBtn, { backgroundColor: theme.primary + '15' }]}>
                            <Feather name="copy" size={12} color={theme.primary} />
                          </TouchableOpacity>
                          
                          {/* Remove Item Button */}
                          {formData.items.length > 1 && (
                            <TouchableOpacity
                              onPress={() => removeItem(index)}
                              style={[styles.removeItemBtn, { backgroundColor: '#F44336' + '15' }]}>
                              <Feather name="x" size={14} color="#F44336" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Item Name */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.itemLabel, { color: theme.text }]}>Item Name *</Text>
                        <TextInput
                          style={[
                            styles.itemInput,
                            {
                              color: theme.text,
                              borderColor: theme.border,
                              backgroundColor: theme.background,
                            },
                          ]}
                          placeholder="e.g., Portland Cement, Steel Rebar..."
                          placeholderTextColor={theme.secondaryText}
                          value={item.itemName}
                          onChangeText={(text) => updateItem(index, 'itemName', text)}
                        />
                      </View>

                      {/* Quantity & Unit Row */}
                      <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={[styles.itemLabel, { color: theme.text }]}>Quantity *</Text>
                          <TextInput
                            style={[
                              styles.itemInput,
                              {
                                color: theme.text,
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                              },
                            ]}
                            placeholder="0"
                            placeholderTextColor={theme.secondaryText}
                            value={item.quantityRequested}
                            onChangeText={(text) => updateItem(index, 'quantityRequested', text)}
                            keyboardType="numeric"
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                          <Text style={[styles.itemLabel, { color: theme.text }]}>Unit</Text>
                          <TouchableOpacity
                            style={[
                              styles.dropdownContainer,
                              { borderColor: theme.border, backgroundColor: theme.background },
                            ]}
                            onPress={() => {
                              Alert.alert(
                                'Select Unit',
                                'Choose a unit for this item',
                                units
                                  .map((unit) => ({
                                    text: unit,
                                    onPress: () => updateItem(index, 'unit', unit),
                                  }))
                                  .concat([{ text: 'Cancel', style: 'cancel' }])
                              );
                            }}>
                            <Text style={[styles.dropdownText, { color: theme.text }]}>
                              {item.unit}
                            </Text>
                            <Feather name="chevron-down" size={16} color={theme.secondaryText} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  
                  {/* Bottom spacing for scroll */}
                  <View style={styles.scrollBottomSpacing} />
                </ScrollView>

                {/* Scroll Helper for Many Items */}
                {formData.items.length > 5 && (
                  <View style={[styles.scrollHelper, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                    <Feather name="info" size={12} color={theme.primary} />
                    <Text style={[styles.scrollHelperText, { color: theme.primary }]}>
                      {formData.items.length} items • Scroll to navigate
                    </Text>
                    <TouchableOpacity
                      onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                      style={[styles.scrollToBottomBtn, { backgroundColor: theme.primary }]}>
                      <Feather name="arrow-down" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Sticky Submit Button */}
                <View style={[styles.submitSection, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                    onPress={submitRequest}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="send" size={16} color="#fff" />
                        <Text style={styles.submitBtnText}>Submit Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {/* Smart Search Section */}
                <View
                  style={[
                    styles.searchContainer,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <View
                    style={[styles.searchIconContainer, { backgroundColor: theme.primary + '10' }]}>
                    <Feather name="search" size={16} color={theme.primary} />
                  </View>
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search by ID, task, user, item, or status..."
                    placeholderTextColor={theme.secondaryText}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={clearSearch}
                      style={[
                        styles.clearSearchBtn,
                        { backgroundColor: theme.secondaryText + '10' },
                      ]}>
                      <Feather name="x" size={14} color={theme.secondaryText} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search Results Summary */}
                {searchQuery.trim() && (
                  <View style={styles.searchSummary}>
                    <Text style={[styles.searchResultsText, { color: theme.secondaryText }]}>
                      {filteredRequests.length === 0
                        ? `No results found for "${searchQuery}"`
                        : `${filteredRequests.length} of ${requests.length} requests found`}
                    </Text>
                    {filteredRequests.length === 0 && (
                      <Text style={[styles.searchHint, { color: theme.secondaryText }]}>
                        Try searching by request ID, task name, user name, material items, or status
                      </Text>
                    )}
                  </View>
                )}

                {/* Request List */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                      Loading requests...
                    </Text>
                  </View>
                ) : filteredRequests.length === 0 && requests.length > 0 ? (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[styles.modernEmptyIcon, { backgroundColor: theme.primary + '10' }]}>
                      <Feather name="search" size={24} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>
                      No matching requests
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.secondaryText }]}>
                      Try different search terms
                    </Text>
                    <TouchableOpacity
                      style={[styles.modernClearBtn, { backgroundColor: theme.primary }]}
                      onPress={clearSearch}>
                      <Feather name="refresh-cw" size={14} color="#fff" />
                      <Text style={styles.modernClearBtnText}>Clear Search</Text>
                    </TouchableOpacity>
                  </View>
                ) : requests.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[styles.modernEmptyIcon, { backgroundColor: theme.primary + '10' }]}>
                      <Feather name="inbox" size={24} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>
                      {taskId ? 'No requests yet' : 'No material requests'}
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.secondaryText }]}>
                      {taskId 
                        ? 'Create your first material request' 
                        : 'No material requests have been made for this project yet'
                      }
                    </Text>
                    {taskId && (
                      <TouchableOpacity
                        style={[styles.modernClearBtn, { backgroundColor: theme.primary }]}
                        onPress={() => setActiveTab('submit')}>
                        <Feather name="plus" size={14} color="#fff" />
                        <Text style={styles.modernClearBtnText}>Add Request</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <FlatList
                    data={filteredRequests}
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    onRefresh={fetchRequests}
                    refreshing={loading}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Request Details Modal */}
      {renderRequestDetails()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 20,
  },
  // Elegant Tab Styles
  elegantTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  elegantTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tabContent: {
    flex: 1,
  },
  elegantTabTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  elegantTabSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // New Form Layout Styles
  formWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  formHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  formHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemCounter: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCounterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clearAllBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  stickyAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  itemsScrollContent: {
    paddingBottom: 20,
  },
  lastItemCard: {
    marginBottom: 20,
  },
  scrollBottomSpacing: {
    height: 80,
  },
  scrollHelper: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -15 }],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  scrollHelperText: {
    fontSize: 10,
    fontWeight: '500',
  },
  scrollToBottomBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  submitSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 5,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 140,
  },
  unitsScrollView: {
    marginTop: 6,
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 16,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  addItemBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  urgencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
    marginRight: 6,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duplicateItemBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeItemBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  itemInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 40,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 20,
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  requesterName: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '48%',
    gap: 4,
    backgroundColor: '#EAF0FF',
    marginBottom: 4,
  },
  itemChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginRight: 6,
    flexShrink: 1,
  },
  itemChipQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  moreItemsChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreItemsText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  requestDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  requirements: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approvedQty: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestDate: {
    fontSize: 11,
  },
  // Details Modal Styles
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  detailsContainer: {
    height: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    borderRadius: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailsContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailsSection: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailsValue: {
    fontSize: 14,
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  detailsItemCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  detailsItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsItemName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  detailsItemQty: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailsRemarks: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Smart Search Styles
  searchSection: {
    margin: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  searchIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    minHeight: 24,
  },
  clearSearchBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSummary: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginTop: 8,
  },
  searchResultsText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  searchHint: {
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.6,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Elegant Request Card Styles
  elegantRequestCard: {
    marginTop: 16,
    marginBottom: 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  elegantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestIdContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  elegantRequestId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  elegantStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  elegantStatusText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  elegantMoreBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elegantCardContent: {
    marginBottom: 10,
  },
  elegantTaskName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 22,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elegantUserName: {
    fontSize: 13,
    fontWeight: '400',
  },
  elegantItemsContainer: {
    marginBottom: 16,
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  elegantItemsGrid: {
    gap: 6,
  },
  elegantItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  itemIconContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  elegantItemName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  elegantItemQty: {
    fontSize: 12,
    fontWeight: '600',
  },
  elegantMoreItemsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'center',
  },
  elegantMoreItemsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  elegantCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  elegantDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  elegantActionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modernEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modernClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  modernClearBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
