import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  SafeAreaView,
  Image as RNImage,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Heart, Image as ImageIcon, ChevronLeft } from 'lucide-react-native';
import { API_ENDPOINTS } from '@/config/api';

interface RecipeDetails {
  id: string;
  name: string;
  cooking_time: number;
  image_url: string | null;
  favoriteId?: string;
  ingredients?: string[];
  instructions?: string[];
}

// Helper function to format cooking time
const formatCookingTime = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} min.`;
  }
  return `${minutes} min.`;
};

export default function RecipeDetailsScreen() {
  const params = useLocalSearchParams();
  const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Parse recipe data from params only once
    if (params.recipe && typeof params.recipe === 'string') {
      try {
        const recipeData = JSON.parse(params.recipe);
        setRecipe(recipeData);
        setIsFavorite(!!recipeData.favoriteId);
        setFavoriteId(recipeData.favoriteId);
      } catch (error) {
        console.error('Error parsing recipe data:', error);
      }
    }
  }, [params.recipe]);

  const handleToggleFavorite = async () => {
    if (!recipe) return;

    // Save current state before optimistic update
    const previousIsFavorite = isFavorite;
    const previousFavoriteId = favoriteId;

    const isRemoving = previousIsFavorite && previousFavoriteId;

    // Optimistic update
    setIsFavorite(!previousIsFavorite);

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      if (isRemoving) {
        // Remove from favorites
        const response = await fetch(
          API_ENDPOINTS.REMOVE_FAVORITE(previousFavoriteId!),
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to remove from favorites');
        }
        setFavoriteId(undefined);
      } else {
        // Add to favorites
        const requestBody = {
          name: recipe.name,
          cooking_time: recipe.cooking_time,
          image_url: recipe.image_url,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
        };

        const response = await fetch(API_ENDPOINTS.FAVORITES, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error('Failed to add to favorites');
        }

        const result = await response.json();
        setFavoriteId(result.data.favoriteId);

        if (result.data.recipeId && recipe.id !== result.data.recipeId) {
          setRecipe({ ...recipe, id: result.data.recipeId });
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Error in handleToggleFavorite:', error);
      setIsFavorite(previousIsFavorite);
      setFavoriteId(previousFavoriteId);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#222831' }}>
        <Box className="flex-1 justify-center items-center">
          <Text style={{ color: '#EEEEEE' }}>Loading...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#222831' }}>
      <VStack className="flex-1 px-4 pt-12 pb-4" space="lg">
        {/* Recipe Image with Overlay Back Button */}
        <Box className="w-full h-64 rounded-lg overflow-hidden" style={{ backgroundColor: '#31363F' }}>
          {recipe.image_url ? (
            <RNImage
              source={{ uri: recipe.image_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Box className="w-full h-full justify-center items-center">
              <ImageIcon size={64} color="#9CA3AF" />
            </Box>
          )}
          
          {/* Back Button Overlay */}
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: 'rgba(49, 54, 63, 0.8)',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <ChevronLeft size={20} color="#EEEEEE" />
            <Text style={{ color: '#EEEEEE', marginLeft: 4, fontSize: 14 }}>Back</Text>
          </Pressable>
        </Box>

        {/* Recipe Name and Heart */}
        <View className="flex-row items-center justify-between">
          <Heading size="2xl" className="flex-1 mr-4" style={{ color: '#EEEEEE' }}>
            {recipe.name}
          </Heading>
          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart
              size={32}
              color="#76ABAE"
              fill={isFavorite ? '#76ABAE' : 'transparent'}
            />
          </Pressable>
        </View>

        {/* Cooking Time */}
        <Text style={{ color: '#76ABAE', fontSize: 18 }}>
          {formatCookingTime(recipe.cooking_time)}
        </Text>

        {/* Scrollable Content */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
            <VStack space="xl">
              {/* Ingredients */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <Box className="p-4 rounded-lg" style={{ backgroundColor: '#31363F' }}>
                  <VStack space="md">
                    <Heading size="xl" style={{ color: '#EEEEEE' }}>
                      Ingredients
                    </Heading>
                    <VStack space="sm">
                      {recipe.ingredients.map((ingredient, index) => (
                        <View key={index} className="flex-row items-start">
                          <Text
                            className="mr-3"
                            style={{
                              color: '#76ABAE',
                              fontSize: 18,
                              lineHeight: 28,
                            }}
                          >
                            •
                          </Text>
                          <Text
                            className="flex-1"
                            style={{
                              color: '#EEEEEE',
                              fontSize: 16,
                              lineHeight: 24,
                            }}
                          >
                            {ingredient}
                          </Text>
                        </View>
                      ))}
                    </VStack>
                  </VStack>
                </Box>
              )}

              {/* Instructions */}
              {recipe.instructions && recipe.instructions.length > 0 && (
                <Box className="p-4 rounded-lg" style={{ backgroundColor: '#31363F' }}>
                  <VStack space="md">
                    <Heading size="xl" style={{ color: '#EEEEEE' }}>
                      Instructions
                    </Heading>
                    <VStack space="md">
                      {recipe.instructions.map((instruction, index) => (
                        <View key={index} className="flex-row items-start gap-3">
                          <Box
                            className="w-8 h-8 rounded-full justify-center items-center"
                            style={{ backgroundColor: '#76ABAE' }}
                          >
                            <Text
                              className="font-bold"
                              style={{ color: '#222831' }}
                            >
                              {index + 1}
                            </Text>
                          </Box>
                          <Text
                            className="flex-1"
                            style={{
                              color: '#EEEEEE',
                              fontSize: 16,
                              lineHeight: 24,
                            }}
                          >
                            {instruction}
                          </Text>
                        </View>
                      ))}
                    </VStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </ScrollView>
      </VStack>
    </SafeAreaView>
  );
}