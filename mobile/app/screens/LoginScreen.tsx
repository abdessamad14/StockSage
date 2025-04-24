import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  const { login, user, loading, error } = useAuth();
  const navigation = useNavigation();

  // Check form validity
  useEffect(() => {
    setIsFormValid(username.trim() !== '' && password.trim() !== '');
  }, [username, password]);

  // If already logged in, navigate to home
  useEffect(() => {
    if (user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' as never }]
      });
    }
  }, [user, navigation]);

  // Handle login
  const handleLogin = async () => {
    if (isFormValid) {
      await login(username, password);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              defaultSource={require('../assets/logo.png')}
            />
            <Text style={styles.appName}>iGoodar Merchant</Text>
            <Text style={styles.tagline}>Manage your orders on the go</Text>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              disabled={loading}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              disabled={loading}
            />
            
            {error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}
            
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              labelStyle={styles.buttonLabel}
              disabled={!isFormValid || loading}
              loading={loading}
            >
              Login
            </Button>
            
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#3366FF',
  },
  tagline: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#3366FF',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6C757D',
    fontSize: 12,
  },
});

export default LoginScreen;