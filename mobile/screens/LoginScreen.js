import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { login, requestOTP, verifyOTP } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuth();

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (loginMode === 'password' && !password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (loginMode === 'otp' && !otpCode) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (loginMode === 'password') {
        result = await login(phone, password);
      } else {
        result = await verifyOTP(phone, otpCode);
      }

      if (result && result.user) {
        setAuth(result.user);
      } else {
        Alert.alert('Login Failed', 'Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error.response?.data?.error || error.message || 'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await requestOTP(phone);
      if (result.success) {
        setOtpRequested(true);
        Alert.alert('Success', 'OTP sent successfully');
        if (result.otpCode) {
          console.log('Development OTP:', result.otpCode);
          // In dev mode we could auto-fill or just show in console
        }
      }
    } catch (error) {
      console.error('OTP request error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Messaging App</Text>
          <Text style={styles.subtitle}>Login to continue</Text>

          {/* Toggle Login Mode */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'password' && styles.activeTab]}
              onPress={() => {
                setLoginMode('password');
                setOtpRequested(false);
              }}
            >
              <Text style={[styles.tabText, loginMode === 'password' && styles.activeTabText]}>
                Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'otp' && styles.activeTab]}
              onPress={() => setLoginMode('otp')}
            >
              <Text style={[styles.tabText, loginMode === 'otp' && styles.activeTabText]}>
                OTP
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          {loginMode === 'password' ? (
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          ) : (
            <>
              {otpRequested && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              )}
              {!otpRequested ? (
                <TouchableOpacity
                  style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                  onPress={handleRequestOTP}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Request OTP</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          <TouchableOpacity
            style={[styles.button, (loading || (loginMode === 'otp' && !otpRequested)) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || (loginMode === 'otp' && !otpRequested)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {loginMode === 'password' ? 'Login' : 'Login with OTP'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED';
const PRIMARY_LIGHT = '#A78BFA';
const LIGHT_BG = '#F9FAFB';
const CARD_BG = '#F9FAFB';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  input: {
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  activeTabText: {
    color: PRIMARY_COLOR,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  secondaryButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});


export default LoginScreen;

