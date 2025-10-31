import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  SafeAreaView,
  Image as RNImage,
  Alert,
  useWindowDimensions,
  Text,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
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
  const { width } = useWindowDimensions();
  const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | undefined>(undefined);
  
  // Determine if screen is wide enough for side-by-side layout
  const isWideScreen = width >= 768;

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

  // Render ingredients and instructions content
  const renderContent = () => (
    <View style={{ gap: 20 }}>
      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <View style={{ backgroundColor: '#31363F', padding: 16, borderRadius: 8 }}>
          <Text style={{ color: '#EEEEEE', fontSize: 24, fontWeight: 'bold', marginBottom: 12, marginTop: 0 }}>
            Ingredients
          </Text>
          <View style={{ gap: isWideScreen ? 0 : 4 }}>
            {recipe.ingredients.map((ingredient, index) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'flex-start',
                }}
              >
                <Text
                  style={{
                    color: '#76ABAE',
                    fontSize: 16,
                    lineHeight: isWideScreen ? 20 : 24,
                    marginRight: 8,
                    marginTop: 0,
                    marginBottom: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                >
                  •
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: '#EEEEEE',
                    fontSize: 16,
                    lineHeight: isWideScreen ? 20 : 24,
                    marginTop: 0,
                    marginBottom: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                >
                  {ingredient}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Instructions */}
      {recipe.instructions && recipe.instructions.length > 0 && (
        <View style={{ backgroundColor: '#31363F', padding: 16, borderRadius: 8 }}>
          <Text style={{ color: '#EEEEEE', fontSize: 24, fontWeight: 'bold', marginBottom: 12, marginTop: 0 }}>
            Instructions
          </Text>
          <View style={{ gap: isWideScreen ? 6 : 12 }}>
            {recipe.instructions.map((instruction, index) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: isWideScreen ? 28 : 32,
                    height: isWideScreen ? 28 : 32,
                    borderRadius: isWideScreen ? 14 : 16,
                    backgroundColor: '#76ABAE',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      color: '#222831',
                      fontWeight: 'bold',
                      fontSize: isWideScreen ? 13 : 14,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: '#EEEEEE',
                    fontSize: 16,
                    lineHeight: isWideScreen ? 20 : 24,
                    marginTop: 0,
                    marginBottom: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                >
                  {instruction}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // Render left column (image, name, time, heart)
  const renderLeftColumn = () => (
    <View style={[{ gap: 16 }, isWideScreen && { width: '40%' }]}>
      {/* Recipe Image with Overlay Back Button */}
      <Box 
        className="w-full rounded-lg overflow-hidden" 
        style={{ 
          backgroundColor: '#31363F',
          height: isWideScreen ? 300 : 256,
        }}
      >
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Heading size="2xl" style={{ color: '#EEEEEE', flex: 1, marginRight: 16 }}>
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
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#222831' }}>
      <View style={{ flex: 1, padding: 16, paddingTop: 48 }}>
        {isWideScreen ? (
          // Wide screen layout: side-by-side with right column scrolling
          <View style={{ flex: 1, flexDirection: 'row', gap: 24 }}>
            {/* Left Column - Static */}
            {renderLeftColumn()}

            {/* Right Column - Scrollable */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          </View>
        ) : (
          // Small screen layout: header static, content scrolls
          <View style={{ flex: 1, gap: 16 }}>
            {/* Header - Static */}
            {renderLeftColumn()}

            {/* Content - Scrollable */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}