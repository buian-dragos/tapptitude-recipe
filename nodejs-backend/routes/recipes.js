const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { authenticateUser } = require('../middleware/auth');

// Get user's favorite recipes
router.get('/favorites', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_favorite_recipes')
      .select(`
        id,
        created_at,
        recipe:recipes (
          id,
          name,
          cooking_time,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Transform the data to flatten recipe object
    const favorites = data.map(fav => ({
      favoriteId: fav.id,
      ...fav.recipe
    }));

    res.json({ data: favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Example: Get all recipes (protected)
router.get('/recipes', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Example: Get single recipe by ID (protected)
router.get('/recipes/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ data });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Example: Create new recipe (protected)
router.post('/recipes', authenticateUser, async (req, res) => {
  try {
    const { title, description, ingredients, instructions } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('recipes')
      .insert([
        {
          title,
          description,
          ingredients,
          instructions,
          user_id: userId
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Add recipe to favorites
router.post('/favorites', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, cooking_time, image_url, ingredients, instructions } = req.body;

    // First, create or get the recipe
    let recipeId;
    
    // Check if recipe already exists by name
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('name', name)
      .single();

    if (existingRecipe) {
      recipeId = existingRecipe.id;
    } else {
      // Create new recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([{
          name,
          cooking_time,
          image_url
        }])
        .select()
        .single();

      if (recipeError) {
        return res.status(400).json({ error: recipeError.message });
      }

      recipeId = newRecipe.id;

      // Add ingredients if provided
      if (ingredients && ingredients.length > 0) {
        const ingredientRecords = ingredients.map((ing, index) => ({
          recipe_id: recipeId,
          ingredient_text: ing,
          order_index: index
        }));

        await supabase
          .from('recipe_ingredients')
          .insert(ingredientRecords);
      }

      // Add instructions if provided
      if (instructions && instructions.length > 0) {
        const stepRecords = instructions.map((step, index) => ({
          recipe_id: recipeId,
          step_text: step,
          step_number: index + 1
        }));

        await supabase
          .from('recipe_steps')
          .insert(stepRecords);
      }
    }

    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from('user_favorite_recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
      .single();

    if (existingFavorite) {
      return res.status(400).json({ error: 'Recipe already in favorites' });
    }

    // Add to favorites
    const { data: favorite, error: favoriteError } = await supabase
      .from('user_favorite_recipes')
      .insert([{
        user_id: userId,
        recipe_id: recipeId
      }])
      .select()
      .single();

    if (favoriteError) {
      return res.status(400).json({ error: favoriteError.message });
    }

    res.status(201).json({ 
      data: {
        favoriteId: favorite.id,
        recipeId: recipeId
      }
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove recipe from favorites
router.delete('/favorites/:favoriteId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { favoriteId } = req.params;

    const { error } = await supabase
      .from('user_favorite_recipes')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Example: Update recipe (protected, user must own the recipe)
router.put('/recipes/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, ingredients, instructions } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('recipes')
      .update({
        title,
        description,
        ingredients,
        instructions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId) // Ensure user owns the recipe
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Recipe not found or unauthorized' });
    }

    res.json({ data });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Example: Delete recipe (protected, user must own the recipe)
router.delete('/recipes/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

module.exports = router;
