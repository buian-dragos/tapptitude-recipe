import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Platform, Pressable, ActivityIndicator, Image as RNImage, Animated, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Search, Heart, Image, X } from 'lucide-react-native';
import { API_ENDPOINTS } from '@/config/api';

interface Recipe {
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

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [excludedRecipes, setExcludedRecipes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Animation for skeleton loaders
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (searching) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [searching]);

  // Fetch user's favorite recipes on mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  // Refresh favorites when screen comes into focus (e.g., returning from recipe details)
  useFocusEffect(
    React.useCallback(() => {
      syncFavoritesWithoutLoading();

      const backAction = () => {
        if (searchQuery.trim()) {
          handleClearSearch();
        }
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [searchQuery])
  );

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

  // Sync favorites without showing loading state (for when returning from recipe details)
  const syncFavoritesWithoutLoading = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.FAVORITES, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const result = await response.json();
      const fetchedFavorites = result.data || [];
      
      // Update favorites list
      setFavorites(fetchedFavorites);

      // Update suggested recipes to reflect favorite status changes.
      // Always map the current suggestedRecipes state to avoid stale closures.
      setSuggestedRecipes(prev =>
        prev.map(recipe => {
          const matchingFavorite = fetchedFavorites.find((fav: Recipe) => fav.name === recipe.name);
          if (matchingFavorite) {
            return {
              ...recipe,
              id: matchingFavorite.id,
              favoriteId: matchingFavorite.favoriteId,
            };
          }
          if (recipe.favoriteId) {
            return { ...recipe, favoriteId: undefined };
          }
          return recipe;
        })
      );
    } catch (err) {
      console.error('Sync favorites error:', err);
    }
  };

  // Clear search and return to favorites
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSuggestedRecipes([]);
    setExcludedRecipes([]);
    setError('');
  };

  // Handle "I don't like these" button
  const handleDislikeRecipes = async () => {
    // Add current suggested recipe names to excluded list
    const currentRecipeNames = suggestedRecipes.map(r => r.name);
    const newExcludedList = [...excludedRecipes, ...currentRecipeNames];
    setExcludedRecipes(newExcludedList);
    
    // Trigger regenerate with excluded recipes
    await handleRegenerateSearch(newExcludedList);
  };

  // Search for recipes using Gemini AI
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search is empty, go back to favorites mode
      setIsSearchMode(false);
      setSuggestedRecipes([]);
      return;
    }

    try {
      setSearching(true);
      setError('');
      setIsSearchMode(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.AI_GENERATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: searchQuery,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          router.replace('/login');
          return;
        }
        setError(result.error || 'Failed to get recipe suggestions');
        return;
      }

      // Transform AI response to match Recipe interface
      // The backend returns { recipes: [...] }
      const recipes = result.recipes.map((recipe: any, index: number) => {
        // Check if this recipe is already in favorites by matching name
        const existingFavorite = favorites.find(f => f.name === recipe.title);
        
        return {
          id: existingFavorite?.id || `ai-${index}`,
          name: recipe.title,
          cooking_time: parseInt(recipe.time.replace(/\D/g, '')) || 0, // Extract number from time string
          image_url: recipe.imageUrl || null,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          favoriteId: existingFavorite?.favoriteId,
        };
      });

      setSuggestedRecipes(recipes);
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Regenerate recipes excluding disliked ones
  const handleRegenerateSearch = async (currentExcludedList: string[]) => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setSearching(true);
      setError('');

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.AI_REGENERATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: searchQuery,
          excludedRecipes: currentExcludedList,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          router.replace('/login');
          return;
        }
        setError(result.error || 'Failed to get recipe suggestions');
        return;
      }

      // Transform AI response to match Recipe interface
      const recipes = result.recipes.map((recipe: any, index: number) => {
        // Check if this recipe is already in favorites by matching name
        const existingFavorite = favorites.find(f => f.name === recipe.title);
        
        return {
          id: existingFavorite?.id || `ai-${index}`,
          name: recipe.title,
          cooking_time: parseInt(recipe.time.replace(/\D/g, '')) || 0,
          image_url: recipe.imageUrl || null,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          favoriteId: existingFavorite?.favoriteId,
        };
      });

      setSuggestedRecipes(recipes);
    } catch (err) {
      console.error('Regenerate search error:', err);
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Add recipe to favorites (optimistic)
  const handleAddToFavorites = async (recipe: Recipe) => {
    // optimistic favorite id
    const optimisticId = `opt-${Date.now()}`;

    // Optimistically update UI: mark suggested recipe as favorited and add to favorites list
    setSuggestedRecipes(prev =>
      prev.map(r => (r.id === recipe.id ? { ...r, favoriteId: optimisticId } : r))
    );

    setFavorites(prev => [
      ...prev,
      {
        id: recipe.id, // temporary / will be updated with real recipeId
        name: recipe.name,
        cooking_time: recipe.cooking_time,
        image_url: recipe.image_url,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        favoriteId: optimisticId,
      },
    ]);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.FAVORITES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: recipe.name,
          cooking_time: recipe.cooking_time,
          image_url: recipe.image_url,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // revert optimistic changes
        setSuggestedRecipes(prev => prev.map(r => (r.id === recipe.id ? { ...r, favoriteId: undefined } : r)));
        setFavorites(prev => prev.filter(f => f.favoriteId !== optimisticId));

        if (response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          router.replace('/login');
          return;
        }

        console.error('Add to favorites error:', result.error);
        return;
      }

      // Replace optimistic favoriteId with real one and update recipe id if provided
      const realFavoriteId = result.data.favoriteId;
      const realRecipeId = result.data.recipeId || recipe.id;

      setSuggestedRecipes(prev => prev.map(r => (r.id === recipe.id ? { ...r, favoriteId: realFavoriteId, id: realRecipeId } : r)));

      setFavorites(prev =>
        prev.map(f => (f.favoriteId === optimisticId ? { 
          ...f, 
          favoriteId: realFavoriteId, 
          id: realRecipeId,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || []
        } : f))
      );
    } catch (err) {
      // revert optimistic changes on error
      setSuggestedRecipes(prev => prev.map(r => (r.id === recipe.id ? { ...r, favoriteId: undefined } : r)));
      setFavorites(prev => prev.filter(f => f.favoriteId !== optimisticId));
      console.error('Add to favorites error:', err);
    }
  };

  // Remove recipe from favorites (optimistic)
  const handleRemoveFromFavorites = async (favoriteId: string, recipeId: string) => {
    // Optimistically remove from favorites and clear favoriteId on suggested recipes
    const prevFavorites = [...favorites];
    setFavorites(prev => prev.filter(f => f.favoriteId !== favoriteId));
    setSuggestedRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, favoriteId: undefined } : r)));

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.REMOVE_FAVORITE(favoriteId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // revert optimistic changes
        setFavorites(prevFavorites);
        setSuggestedRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, favoriteId } : r)));

        if (response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          router.replace('/login');
          return;
        }

        const result = await response.json();
        console.error('Remove from favorites error:', result.error);
        return;
      }
    } catch (err) {
      // revert optimistic changes
      setFavorites(prevFavorites);
      setSuggestedRecipes(prev => prev.map(r => (r.id === recipeId ? { ...r, favoriteId } : r)));
      console.error('Remove from favorites error:', err);
    }
  };

  // Toggle favorite status (optimistic)
  const handleToggleFavorite = async (recipe: Recipe) => {
    if (recipe.favoriteId) {
      // Remove from favorites
      await handleRemoveFromFavorites(recipe.favoriteId, recipe.id);
    } else {
      // Add to favorites
      await handleAddToFavorites(recipe);
    }
  };

  // Navigate to a recipe details page
  const handleFavoritePress = (recipe: Recipe) => {
    router.push({
      pathname: '/recipe-details',
      params: {
        recipe: JSON.stringify(recipe)
      }
    } as any);
  };

  const insets = useSafeAreaInsets();

  return (
    <View 
      className="flex-1 bg-background-0" 
      style={{ 
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <VStack className="flex-1 p-6 pt-12" space="xl">
        {/* Search Bar - Static */}
        <Input
          className="bg-background-100 border-outline-200 rounded-full"
          size="lg"
        >
          <InputField
            placeholder="What do you feel like eating?"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // If text is cleared, return to favorites mode
              if (!text.trim()) {
                setIsSearchMode(false);
                setSuggestedRecipes([]);
              }
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            className="text-typography-950"
            placeholderTextColor="rgb(160 160 160)"
            editable={!searching}
          />
          <InputSlot onPress={searchQuery.trim() ? handleClearSearch : handleSearch} className="pr-3">
            {searching ? (
              <ActivityIndicator size="small" color="#76ABAE" />
            ) : searchQuery.trim() ? (
              <InputIcon as={X} className="text-typography-700" />
            ) : (
              <InputIcon as={Search} className="text-typography-700" />
            )}
          </InputSlot>
        </Input>

        {/* Title - Static */}
        <Heading size="2xl" className="text-typography-950">
          {isSearchMode ? 'Suggested recipes' : 'Favorites'}
        </Heading>

        {/* Scrollable Recipes Section */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="md">
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
            ) : isSearchMode ? (
              /* Suggested Recipes List */
              searching ? (
                /* Skeleton Loaders for suggested recipes */
                <VStack space="md">
                  {[1, 2, 3, 4, 5].map((index) => {
                    const opacity = pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    });

                    return (
                      <View
                        key={`skeleton-${index}`}
                        className="p-3 rounded-lg bg-background-50 flex-row items-center"
                      >
                        {/* Skeleton Image */}
                        <Animated.View style={{ opacity }}>
                          <Box className="w-16 h-16 bg-background-200 rounded-md mr-3" />
                        </Animated.View>

                        {/* Skeleton Text Content */}
                        <VStack className="flex-1" space="xs">
                          <Animated.View style={{ opacity }}>
                            <Box className="h-5 bg-background-200 rounded" style={{ width: '70%' }} />
                          </Animated.View>
                          <Animated.View style={{ opacity }}>
                            <Box className="h-4 bg-background-200 rounded" style={{ width: '40%' }} />
                          </Animated.View>
                        </VStack>

                        {/* Skeleton Heart Icon */}
                        <Animated.View style={{ opacity }}>
                          <Box className="w-6 h-6 bg-background-200 rounded-full" />
                        </Animated.View>
                      </View>
                    );
                  })}
                </VStack>
              ) : suggestedRecipes.length === 0 ? (
                <Box className="py-8 items-center">
                  <Text className="text-typography-600 text-center text-base">
                    No recipes found. Try a different search.
                  </Text>
                </Box>
              ) : (
                <VStack space="md">
                  {suggestedRecipes.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handleFavoritePress(item)}
                      className="w-full"
                    >
                      {({ pressed }: { pressed: boolean }) => (
                        <View
                          className="p-3 rounded-lg bg-background-50 flex-row items-center"
                          style={{
                            opacity: pressed ? 0.7 : 1,
                          }}
                        >
                          {/* Recipe Image */}
                          <Box className="w-16 h-16 bg-background-100 rounded-md overflow-hidden mr-3">
                            {item.image_url ? (
                              <RNImage 
                                source={{ uri: item.image_url }} 
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <Box className="w-full h-full justify-center items-center">
                                <Image size={32} color="#9CA3AF" />
                              </Box>
                            )}
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
                              {formatCookingTime(item.cooking_time)}
                            </Text>
                          </VStack>

                          {/* Heart Icon - Toggle favorite */}
                          <Pressable 
                            onPress={() => handleToggleFavorite(item)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Heart 
                              size={24} 
                              color="#76ABAE" 
                              fill={item.favoriteId ? "#76ABAE" : "transparent"} 
                            />
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </VStack>
              )
            ) : null}

            {/* "I don't like these" button - only visible in search mode with results */}
            {isSearchMode && suggestedRecipes.length > 0 && (
              <Box className="mt-4">
                <Button
                  onPress={handleDislikeRecipes}
                  disabled={searching}
                  className="bg-primary-500 rounded-lg"
                  size="lg"
                >
                  <ButtonText className="text-gray-900 font-semibold">
                    I don't like these
                  </ButtonText>
                </Button>
              </Box>
            )}

            {/* Only show favorites when NOT in search mode */}
            {!isSearchMode && (
              favorites.length === 0 ? (
                <Box className="py-8 items-center">
                  <Text className="text-typography-600 text-center text-base">
                    Add favourites by using the search feature
                  </Text>
                </Box>
              ) : (
                <VStack space="md">
                  {favorites.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleFavoritePress(item)}
                    className="w-full"
                  >
                    {({ pressed }: { pressed: boolean }) => (
                      <View
                        className="p-3 rounded-lg bg-background-50 flex-row items-center"
                        style={{
                          opacity: pressed ? 0.7 : 1,
                        }}
                      >
                        {/* Recipe Image */}
                        <Box className="w-16 h-16 bg-background-100 rounded-md overflow-hidden mr-3">
                          {item.image_url ? (
                            <RNImage 
                              source={{ uri: item.image_url }} 
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Box className="w-full h-full justify-center items-center">
                              <Image size={32} color="#9CA3AF" />
                            </Box>
                          )}
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
                            {formatCookingTime(item.cooking_time)}
                          </Text>
                        </VStack>

                        {/* Heart Icon - Remove from favorites */}
                        <Pressable 
                          onPress={() => item.favoriteId && handleRemoveFromFavorites(item.favoriteId, item.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Heart size={24} color="#76ABAE" fill="#76ABAE" />
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                  ))}
                </VStack>
              )
            )}
          </VStack>
        </ScrollView>
      </VStack>
    </View>
  );
}