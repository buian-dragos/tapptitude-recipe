import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { API_ENDPOINTS } from '@/config/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store token and user data
      const token = data.data.session.access_token;
      const user = data.data.user;
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userId', user.id);
      
      console.log('Login successful, token:', token);
      
      // Navigate to main app
      router.replace('/(tabs)' as any);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background-0">
        <View className="flex-1 justify-center items-center p-6 bg-background-0">
          <Box className="w-full max-w-md p-6 border border-outline-100 rounded-lg bg-background-50">
            <VStack space="xl">
              {/* Header */}
              <VStack space="xs">
                <Heading size="2xl" className="text-typography-950">
                  Welcome Back
                </Heading>
                <Text className="text-sm text-typography-600">
                  Sign in to continue to Tapptitude Recipe
                </Text>
              </VStack>

              {/* Error Message */}
              {error ? (
                <Box className="p-3 bg-error-100 rounded-md">
                  <Text className="text-sm text-error-700">{error}</Text>
                </Box>
              ) : null}

              {/* Form */}
              <VStack space="md">
                <VStack space="xs">
                  <Text className="text-sm font-medium text-typography-800">
                    Email
                  </Text>
                  <Input className="bg-background-100 border-outline-200">
                    <InputField
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      className="text-typography-950"
                      placeholderTextColor="rgb(160 160 160)"
                    />
                  </Input>
                </VStack>

                <VStack space="xs">
                  <Text className="text-sm font-medium text-typography-800">
                    Password
                  </Text>
                  <Input className="bg-background-100 border-outline-200">
                    <InputField
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      className="text-typography-950"
                      placeholderTextColor="rgb(160 160 160)"
                    />
                  </Input>
                </VStack>
              </VStack>

              {/* Login Button */}
              <Button
                size="lg"
                onPress={handleLogin}
                isDisabled={loading}
                className="w-full"
              >
                <ButtonText className="text-gray-900">
                  {loading ? 'Signing in...' : 'Sign In'}
                </ButtonText>
              </Button>

              {/* Register Link */}
              <VStack space="xs" className="items-center">
                <Text className="text-sm text-typography-600">
                  Don't have an account?
                </Text>
                <Button
                  variant="link"
                  size="sm"
                  onPress={() => router.push('/register' as any)}
                  className="p-0"
                >
                  <ButtonText className="text-sm text-primary-500">Sign Up</ButtonText>
                </Button>
              </VStack>
            </VStack>
          </Box>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
