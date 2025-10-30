import React, { useState, useEffect } from 'react';
import { ScrollView, View, Platform, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { Search, Heart, Image } from 'lucide-react-native';
import { API_ENDPOINTS } from '@/config/api';

interface Recipe {
  id: string;
  name: string;
  cooking_time: number;
  image_url: string | null;
  favoriteId?: string;
}

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch user's favorite recipes
  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.FAVORITES, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, redirect to login
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          router.replace('/login');
          return;
        }
        setError(result.error || 'Failed to load favorites');
        return;
      }

      setFavorites(result.data || []);
    } catch (err) {
      console.error('Fetch favorites error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // You can replace this with a real search handler
  const handleSearch = () => {
    console.log('Searching for:', searchQuery);
    //
    // TODO: Implement search logic
    // e.g., router.push(`/search?q=${searchQuery}`);
    //
  };

  // Navigate to a recipe details page
  const handleFavoritePress = (id: string) => {
    console.log('Navigating to recipe:', id);
    //
    // TODO: Update route as per your file structure
    //
    // router.push(`/recipe/${id}` as any);
  };

  return (
    // Use SafeAreaView to avoid status bar overlap
    // Assuming bg-background-0 is your light '#eeeeee' color
    <SafeAreaView className="flex-1 bg-background-0">
      {/* ScrollView for the list content */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main content container with padding and extra top padding */}
        <VStack space="xl" className="p-6 pt-12">
          {/* Search Bar */}
          <Input
            className="bg-background-100 border-outline-200 rounded-full"
            size="lg"
          >
            <InputField
              placeholder="What do you feel like eating?"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              className="text-typography-950"
              placeholderTextColor="rgb(160 160 160)"
            />
            <InputSlot onPress={handleSearch} className="pr-3">
              <InputIcon as={Search} className="text-typography-700" />
            </InputSlot>
          </Input>

          {/* Favorites Section */}
          <VStack space="md">
            <Heading size="2xl" className="text-typography-950">
              Favorites
            </Heading>

            {/* Loading State */}
            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#76ABAE" />
              </View>
            ) : error ? (
              /* Error State */
              <Box className="p-4 bg-error-100 rounded-lg">
                <Text className="text-error-700 text-center">{error}</Text>
              </Box>
            ) : favorites.length === 0 ? (
              /* Empty State */
              <Box className="py-8 items-center">
                <Text className="text-typography-600 text-center text-base">
                  Add favourites by using the search feature
                </Text>
              </Box>
            ) : (
              /* Favorites List */
              <VStack space="md">
                {favorites.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleFavoritePress(item.id)}
                    className="w-full"
                  >
                    {({ pressed }: { pressed: boolean }) => (
                      <View
                        className="p-3 rounded-lg bg-background-50 flex-row items-center"
                        style={{
                          opacity: pressed ? 0.7 : 1,
                        }}
                      >
                        {/* Image Placeholder */}
                        <Box className="w-16 h-16 bg-background-100 rounded-md justify-center items-center mr-3">
                          <Image size={32} color="#9CA3AF" />
                        </Box>

                        {/* Text Content */}
                        <VStack className="flex-1">
                          <Text
                            className="text-typography-900 font-semibold"
                            size="md"
                          >
                            {item.name}
                          </Text>
                          <Text className="text-typography-600" size="sm">
                            {item.cooking_time} min.
                          </Text>
                        </VStack>

                        {/* Heart Icon */}
                        {/* Using your teal color '#76abae' */}
                        <Heart size={24} color="#76ABAE" fill="#76ABAE" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}