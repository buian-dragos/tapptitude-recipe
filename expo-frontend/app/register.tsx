import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { API_ENDPOINTS } from '@/config/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          metadata: { name },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess('Account created successfully! Redirecting to login...');
      
      // Wait 2 seconds then redirect to login
      setTimeout(() => {
        router.replace('/login' as any);
      }, 2000);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Registration error:', err);
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
                  Create Account
                </Heading>
                <Text className="text-sm text-typography-600">
                  Sign up to get started with Tapptitude Recipe
                </Text>
              </VStack>

              {/* Error Message */}
              {error ? (
                <Box className="p-3 bg-error-100 rounded-md">
                  <Text className="text-sm text-error-700">{error}</Text>
                </Box>
              ) : null}

              {/* Success Message */}
              {success ? (
                <Box className="p-3 bg-success-100 rounded-md">
                  <Text className="text-sm text-success-700">{success}</Text>
                </Box>
              ) : null}

              {/* Form */}
              <VStack space="md">
                <VStack space="xs">
                  <Text className="text-sm font-medium text-typography-800">
                    Full Name
                  </Text>
                  <Input className="bg-background-100 border-outline-200">
                    <InputField
                      placeholder="Enter your name"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      className="text-typography-950"
                      placeholderTextColor="rgb(160 160 160)"
                    />
                  </Input>
                </VStack>

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
                      placeholder="Create a password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      className="text-typography-950"
                      placeholderTextColor="rgb(160 160 160)"
                    />
                  </Input>
                  <Text className="text-xs text-typography-500">
                    Must be at least 6 characters
                  </Text>
                </VStack>

                <VStack space="xs">
                  <Text className="text-sm font-medium text-typography-800">
                    Confirm Password
                  </Text>
                  <Input className="bg-background-100 border-outline-200">
                    <InputField
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      className="text-typography-950"
                      placeholderTextColor="rgb(160 160 160)"
                    />
                  </Input>
                </VStack>
              </VStack>

              {/* Register Button */}
              <Button
                size="lg"
                onPress={handleRegister}
                isDisabled={loading}
                className="w-full"
              >
                <ButtonText className="text-gray-900">
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </ButtonText>
              </Button>

              {/* Login Link */}
              <VStack space="xs" className="items-center">
                <Text className="text-sm text-typography-600">
                  Already have an account?
                </Text>
                <Button
                  variant="link"
                  size="sm"
                  onPress={() => router.push('/login' as any)}
                  className="p-0"
                >
                  <ButtonText className="text-sm text-primary-500">Sign In</ButtonText>
                </Button>
              </VStack>
            </VStack>
          </Box>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
