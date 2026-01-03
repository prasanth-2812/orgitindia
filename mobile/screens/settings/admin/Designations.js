import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getDesignations, createDesignation, updateDesignation, deleteDesignation } from '../../../services/settingsService';

export default function Designations({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [designations, setDesignations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', level: '' });

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    try {
      setLoading(true);
      const response = await getDesignations();
      if (response.success) {
        setDesignations(response.data || []);
      }
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load designations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Designation name is required');
      return;
    }

    try {
      let response;
      const payload = {
        name: formData.name,
        description: formData.description,
        level: formData.level ? parseInt(formData.level) : null,
      };

      if (editingDesignation && editingDesignation.id) {
        response = await updateDesignation(editingDesignation.id, payload);
      } else {
        response = await createDesignation(payload);
      }

      if (response.success) {
        setModalVisible(false);
        setEditingDesignation(null);
        setFormData({ name: '', description: '', level: '' });
        loadDesignations();
        Alert.alert('Success', editingDesignation ? 'Designation updated successfully' : 'Designation created successfully');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save designation');
    }
  };

  const handleDelete = (desig) => {
    if (!desig.id) {
      Alert.alert('Info', 'This designation cannot be deleted as it is stored in user records');
      return;
    }

    Alert.alert(
      'Delete Designation',
      `Are you sure you want to delete "${desig.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteDesignation(desig.id);
              if (response.success) {
                loadDesignations();
                Alert.alert('Success', 'Designation deleted successfully');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete designation');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (desig = null) => {
    if (desig) {
      setEditingDesignation(desig);
      setFormData({
        name: desig.name || '',
        description: desig.description || '',
        level: desig.level ? desig.level.toString() : '',
      });
    } else {
      setEditingDesignation(null);
      setFormData({ name: '', description: '', level: '' });
    }
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Designations</Text>
        <TouchableOpacity onPress={() => openEditModal(null)} style={styles.addBtn}>
          <MaterialIcons name="add" size={24} color="#a413ec" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a413ec" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {designations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="badge" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No designations yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to create one</Text>
            </View>
          ) : (
            designations.map((desig) => (
              <View key={desig.id || desig.name} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{desig.name}</Text>
                  {desig.description && (
                    <Text style={styles.cardSubtitle}>{desig.description}</Text>
                  )}
                  {desig.level && (
                    <Text style={styles.cardLevel}>Level: {desig.level}</Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  {desig.id && (
                    <>
                      <TouchableOpacity onPress={() => openEditModal(desig)} style={styles.actionBtn}>
                        <MaterialIcons name="edit" size={20} color="#a413ec" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(desig)} style={styles.actionBtn}>
                        <MaterialIcons name="delete" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDesignation ? 'Edit Designation' : 'Add Designation'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Designation Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter designation name"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter description (optional)"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Level (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.level}
                onChangeText={(text) => setFormData({ ...formData, level: text.replace(/[^0-9]/g, '') })}
                placeholder="Enter level (numeric)"
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f6f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f7f6f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardLevel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#a413ec',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

