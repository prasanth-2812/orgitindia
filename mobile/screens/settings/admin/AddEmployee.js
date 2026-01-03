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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getDepartments, getDesignations, createEmployee } from '../../../services/settingsService';

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (phone.startsWith('+')) {
    return phone;
  }
  return cleaned.length === 10 ? `+91${cleaned}` : phone;
};

export default function AddEmployee({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showDesignationPicker, setShowDesignationPicker] = useState(false);
  const [formData, setFormData] = useState({
    mobile: '',
    name: '',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [deptResponse, desigResponse] = await Promise.all([
        getDepartments(),
        getDesignations(),
      ]);

      if (deptResponse.success) {
        setDepartments(deptResponse.data || []);
      }
      if (desigResponse.success) {
        setDesignations(desigResponse.data || []);
      }
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load departments and designations');
    }
  };

  const handleSave = async () => {
    if (!formData.mobile.trim()) {
      Alert.alert('Error', 'Mobile number is required');
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Employee name is required');
      return;
    }

    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    const formattedMobile = formatPhoneNumber(formData.mobile);
    if (!/^\+\d{6,20}$/.test(formattedMobile)) {
      Alert.alert('Error', 'Invalid mobile number format. Use international format (e.g., +911234567890)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        mobile: formattedMobile,
        name: formData.name.trim(),
        department: selectedDepartment.name || selectedDepartment,
        designation: selectedDesignation ? (selectedDesignation.name || selectedDesignation) : null,
        password: formData.password || undefined, // Only required for new users
      };

      const response = await createEmployee(payload);
      if (response.success) {
        Alert.alert('Success', response.message || 'Employee added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Employee</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.mobile}
            onChangeText={(text) => setFormData({ ...formData, mobile: text })}
            placeholder="Enter mobile number (e.g., 9876543210)"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>If user exists, they will be added to your organization. If new, password is required.</Text>

          <Text style={styles.label}>Employee Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter employee name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Department *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDepartmentPicker(true)}
          >
            <Text style={[styles.pickerText, !selectedDepartment && styles.pickerPlaceholder]}>
              {selectedDepartment ? (selectedDepartment.name || selectedDepartment) : 'Select Department'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
          </TouchableOpacity>

          <Text style={styles.label}>Designation (optional)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDesignationPicker(true)}
          >
            <Text style={[styles.pickerText, !selectedDesignation && styles.pickerPlaceholder]}>
              {selectedDesignation ? (selectedDesignation.name || selectedDesignation) : 'Select Designation'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
          </TouchableOpacity>

          <Text style={styles.label}>Password (for new users only)</Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            placeholder="Enter password (min 6 characters)"
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.hint}>Required only if the user doesn't exist. Minimum 6 characters.</Text>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Add Employee</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Department Picker Modal */}
      {showDepartmentPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setShowDepartmentPicker(false)}>
                <MaterialIcons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept.id || dept.name}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedDepartment(dept);
                    setShowDepartmentPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{dept.name}</Text>
                  {selectedDepartment && (selectedDepartment.id === dept.id || selectedDepartment.name === dept.name) && (
                    <MaterialIcons name="check" size={20} color="#a413ec" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Designation Picker Modal */}
      {showDesignationPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Designation</Text>
              <TouchableOpacity onPress={() => setShowDesignationPicker(false)}>
                <MaterialIcons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedDesignation(null);
                  setShowDesignationPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>None</Text>
                {!selectedDesignation && (
                  <MaterialIcons name="check" size={20} color="#a413ec" />
                )}
              </TouchableOpacity>
              {designations.map((desig) => (
                <TouchableOpacity
                  key={desig.id || desig.name}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedDesignation(desig);
                    setShowDesignationPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{desig.name}</Text>
                  {selectedDesignation && (selectedDesignation.id === desig.id || selectedDesignation.name === desig.name) && (
                    <MaterialIcons name="check" size={20} color="#a413ec" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerPlaceholder: {
    color: '#9ca3af',
  },
  saveButton: {
    backgroundColor: '#a413ec',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
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
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#111827',
  },
});

