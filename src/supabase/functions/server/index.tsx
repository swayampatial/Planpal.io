import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize storage bucket for profile pictures
const initStorage = async () => {
  const bucketName = 'make-d40630a2-profiles';
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
    console.log('Created profile pictures bucket');
  }
};

initStorage();

// Helper to get authenticated user
const getAuthUser = async (request: Request) => {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
};

// ========== AUTH ROUTES ==========

app.post('/make-server-d40630a2/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Create user with Supabase auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Initialize user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      profilePicture: null,
      groups: [],
      rewards: {
        points: 0,
        movieDiscounts: [],
        cashback: 0
      },
      createdAt: new Date().toISOString()
    });

    return c.json({ user: data.user, message: 'Account created successfully' });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// ========== PROFILE ROUTES ==========

app.get('/make-server-d40630a2/profile', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

app.post('/make-server-d40630a2/profile/update', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name } = await c.req.json();
    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const updatedProfile = { ...profile, name };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ profile: updatedProfile, message: 'Profile updated successfully' });
  } catch (error) {
    console.log(`Update profile error: ${error}`);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

app.post('/make-server-d40630a2/profile/upload-picture', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const bucketName = 'make-d40630a2-profiles';
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.log(`Upload error: ${uploadError.message}`);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    const profile = await kv.get(`user:${user.id}`);
    const updatedProfile = { ...profile, profilePicture: signedUrlData?.signedUrl };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ 
      profilePicture: signedUrlData?.signedUrl,
      message: 'Profile picture uploaded successfully' 
    });
  } catch (error) {
    console.log(`Upload picture error: ${error}`);
    return c.json({ error: 'Failed to upload picture' }, 500);
  }
});

// ========== GROUP ROUTES ==========

app.post('/make-server-d40630a2/groups/create', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, description, password } = await c.req.json();
    
    if (!name || !password) {
      return c.json({ error: 'Group name and password are required' }, 400);
    }

    const groupId = crypto.randomUUID();
    const group = {
      id: groupId,
      name,
      description: description || '',
      password,
      createdBy: user.id,
      members: [user.id],
      polls: [],
      createdAt: new Date().toISOString()
    };

    await kv.set(`group:${groupId}`, group);

    // Add group to user's groups
    const profile = await kv.get(`user:${user.id}`);
    const updatedProfile = { ...profile, groups: [...(profile.groups || []), groupId] };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ group, message: 'Group created successfully' });
  } catch (error) {
    console.log(`Create group error: ${error}`);
    return c.json({ error: 'Failed to create group' }, 500);
  }
});

app.post('/make-server-d40630a2/groups/join', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, password } = await c.req.json();
    
    if (!groupId || !password) {
      return c.json({ error: 'Group ID and password are required' }, 400);
    }

    const group = await kv.get(`group:${groupId}`);
    
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    if (group.password !== password) {
      return c.json({ error: 'Incorrect password' }, 401);
    }

    if (group.members.includes(user.id)) {
      return c.json({ error: 'You are already a member of this group' }, 400);
    }

    // Add user to group
    const updatedGroup = { ...group, members: [...group.members, user.id] };
    await kv.set(`group:${groupId}`, updatedGroup);

    // Add group to user's groups
    const profile = await kv.get(`user:${user.id}`);
    const updatedProfile = { ...profile, groups: [...(profile.groups || []), groupId] };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ group: updatedGroup, message: 'Joined group successfully' });
  } catch (error) {
    console.log(`Join group error: ${error}`);
    return c.json({ error: 'Failed to join group' }, 500);
  }
});

app.get('/make-server-d40630a2/groups/:groupId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    const group = await kv.get(`group:${groupId}`);
    
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    if (!group.members.includes(user.id)) {
      return c.json({ error: 'You are not a member of this group' }, 403);
    }

    // Fetch member details
    const memberDetails = await Promise.all(
      group.members.map(async (memberId: string) => {
        const member = await kv.get(`user:${memberId}`);
        return {
          id: memberId,
          name: member?.name || 'Unknown',
          profilePicture: member?.profilePicture
        };
      })
    );

    return c.json({ group: { ...group, memberDetails } });
  } catch (error) {
    console.log(`Get group error: ${error}`);
    return c.json({ error: 'Failed to fetch group' }, 500);
  }
});

app.get('/make-server-d40630a2/groups', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    const groupIds = profile?.groups || [];
    
    const groups = await Promise.all(
      groupIds.map(async (groupId: string) => {
        return await kv.get(`group:${groupId}`);
      })
    );

    return c.json({ groups: groups.filter(g => g !== null) });
  } catch (error) {
    console.log(`Get groups error: ${error}`);
    return c.json({ error: 'Failed to fetch groups' }, 500);
  }
});

// ========== POLL ROUTES ==========

app.post('/make-server-d40630a2/polls/create', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, question, options, type } = await c.req.json();
    
    if (!groupId || !question || !options || options.length < 2) {
      return c.json({ error: 'Group ID, question, and at least 2 options are required' }, 400);
    }

    const group = await kv.get(`group:${groupId}`);
    if (!group || !group.members.includes(user.id)) {
      return c.json({ error: 'Group not found or unauthorized' }, 403);
    }

    const pollId = crypto.randomUUID();
    const poll = {
      id: pollId,
      groupId,
      question,
      type: type || 'general', // general, movie, restaurant, location
      options: options.map((opt: any) => ({
        id: crypto.randomUUID(),
        text: opt.text || opt,
        data: opt.data || null, // Additional data like movie info, restaurant info
        votes: [],
        reactions: {}
      })),
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };

    await kv.set(`poll:${pollId}`, poll);

    // Add poll to group
    const updatedGroup = { ...group, polls: [...(group.polls || []), pollId] };
    await kv.set(`group:${groupId}`, updatedGroup);

    return c.json({ poll, message: 'Poll created successfully' });
  } catch (error) {
    console.log(`Create poll error: ${error}`);
    return c.json({ error: 'Failed to create poll' }, 500);
  }
});

app.post('/make-server-d40630a2/polls/:pollId/vote', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const pollId = c.req.param('pollId');
    const { optionId } = await c.req.json();
    
    if (!optionId) {
      return c.json({ error: 'Option ID is required' }, 400);
    }

    const poll = await kv.get(`poll:${pollId}`);
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check if user is in the group
    const group = await kv.get(`group:${poll.groupId}`);
    if (!group || !group.members.includes(user.id)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Remove previous vote
    poll.options = poll.options.map((opt: any) => ({
      ...opt,
      votes: opt.votes.filter((v: string) => v !== user.id)
    }));

    // Add new vote
    const optionIndex = poll.options.findIndex((opt: any) => opt.id === optionId);
    if (optionIndex === -1) {
      return c.json({ error: 'Option not found' }, 404);
    }

    poll.options[optionIndex].votes.push(user.id);
    await kv.set(`poll:${pollId}`, poll);

    return c.json({ poll, message: 'Vote recorded successfully' });
  } catch (error) {
    console.log(`Vote error: ${error}`);
    return c.json({ error: 'Failed to record vote' }, 500);
  }
});

app.post('/make-server-d40630a2/polls/:pollId/react', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const pollId = c.req.param('pollId');
    const { optionId, emoji } = await c.req.json();
    
    if (!optionId || !emoji) {
      return c.json({ error: 'Option ID and emoji are required' }, 400);
    }

    const poll = await kv.get(`poll:${pollId}`);
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check if user is in the group
    const group = await kv.get(`group:${poll.groupId}`);
    if (!group || !group.members.includes(user.id)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const optionIndex = poll.options.findIndex((opt: any) => opt.id === optionId);
    if (optionIndex === -1) {
      return c.json({ error: 'Option not found' }, 404);
    }

    if (!poll.options[optionIndex].reactions) {
      poll.options[optionIndex].reactions = {};
    }

    if (!poll.options[optionIndex].reactions[emoji]) {
      poll.options[optionIndex].reactions[emoji] = [];
    }

    // Toggle reaction
    const reactionIndex = poll.options[optionIndex].reactions[emoji].indexOf(user.id);
    if (reactionIndex > -1) {
      poll.options[optionIndex].reactions[emoji].splice(reactionIndex, 1);
    } else {
      poll.options[optionIndex].reactions[emoji].push(user.id);
    }

    await kv.set(`poll:${pollId}`, poll);

    return c.json({ poll, message: 'Reaction updated successfully' });
  } catch (error) {
    console.log(`React error: ${error}`);
    return c.json({ error: 'Failed to update reaction' }, 500);
  }
});

app.get('/make-server-d40630a2/polls/:pollId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const pollId = c.req.param('pollId');
    const poll = await kv.get(`poll:${pollId}`);
    
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    const group = await kv.get(`group:${poll.groupId}`);
    if (!group || !group.members.includes(user.id)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    return c.json({ poll });
  } catch (error) {
    console.log(`Get poll error: ${error}`);
    return c.json({ error: 'Failed to fetch poll' }, 500);
  }
});

// ========== SUGGESTIONS ROUTES ==========

app.get('/make-server-d40630a2/suggestions/movies', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const mood = c.req.query('mood') || 'popular';
    const apiKey = Deno.env.get('TMDB_API_KEY');
    
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured' }, 500);
    }

    let endpoint = 'popular';
    if (mood === 'adventurous') endpoint = 'popular';
    if (mood === 'chill') endpoint = 'top_rated';
    if (mood === 'foodie') endpoint = 'popular'; // Can be customized

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${endpoint}?api_key=${apiKey}&language=en-US&page=1`
    );

    if (!response.ok) {
      console.log(`TMDB API error: ${response.statusText}`);
      return c.json({ error: 'Failed to fetch movies' }, 500);
    }

    const data = await response.json();
    const movies = data.results.slice(0, 10).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      rating: movie.vote_average,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      releaseDate: movie.release_date
    }));

    return c.json({ movies });
  } catch (error) {
    console.log(`Get movies error: ${error}`);
    return c.json({ error: 'Failed to fetch movie suggestions' }, 500);
  }
});

app.get('/make-server-d40630a2/suggestions/places', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const type = c.req.query('type') || 'restaurant';
    const location = c.req.query('location') || '40.7128,-74.0060'; // Default NYC
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!apiKey) {
      return c.json({ error: 'Google Places API key not configured' }, 500);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=5000&type=${type}&key=${apiKey}`
    );

    if (!response.ok) {
      console.log(`Google Places API error: ${response.statusText}`);
      return c.json({ error: 'Failed to fetch places' }, 500);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.log(`Google Places API status: ${data.status}`);
      return c.json({ error: `Google Places API error: ${data.status}` }, 500);
    }

    const places = (data.results || []).slice(0, 10).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      photos: place.photos?.[0]?.photo_reference ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}` 
        : null,
      location: place.geometry.location
    }));

    return c.json({ places });
  } catch (error) {
    console.log(`Get places error: ${error}`);
    return c.json({ error: 'Failed to fetch place suggestions' }, 500);
  }
});

// ========== REWARDS ROUTES ==========

app.get('/make-server-d40630a2/rewards', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Calculate rewards based on activity
    const groups = await kv.getByPrefix('group:');
    const userGroups = groups.filter((g: any) => g.members?.includes(user.id));
    const points = userGroups.length * 10; // 10 points per group

    const rewards = {
      points,
      level: Math.floor(points / 50) + 1,
      movieDiscounts: [
        { provider: 'AMC Theatres', discount: '10% off', code: 'PLANPAL10' },
        { provider: 'Regal Cinemas', discount: '15% off', code: 'PLANPAL15' }
      ],
      cashback: points * 0.1, // $0.10 per point
      badges: []
    };

    if (points >= 50) rewards.badges.push('Social Butterfly');
    if (points >= 100) rewards.badges.push('Party Planner Pro');
    if (userGroups.length >= 5) rewards.badges.push('Group Master');

    // Update profile with rewards
    await kv.set(`user:${user.id}`, { ...profile, rewards });

    return c.json({ rewards });
  } catch (error) {
    console.log(`Get rewards error: ${error}`);
    return c.json({ error: 'Failed to fetch rewards' }, 500);
  }
});

// ========== AI CHAT ROUTES ==========

app.post('/make-server-d40630a2/chat', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, message, context } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Get group context if groupId is provided
    let systemPrompt = `You are PlanPal Bot, a friendly AI assistant that helps groups coordinate events, movie nights, weekend trips, and hangouts. 
You can suggest movies, restaurants, and activities based on mood (chill, adventurous, foodie).
Be concise, enthusiastic, and helpful. Use emojis occasionally to make responses fun.`;

    if (groupId) {
      const group = await kv.get(`group:${groupId}`);
      if (group) {
        systemPrompt += `\n\nCurrent group: ${group.name}${group.description ? ` - ${group.description}` : ''}
Members: ${group.members.length} people`;
        
        if (group.polls && group.polls.length > 0) {
          const polls = await Promise.all(
            group.polls.slice(-3).map(async (pollId: string) => await kv.get(`poll:${pollId}`))
          );
          systemPrompt += `\n\nRecent polls: ${polls.map((p: any) => p?.question).filter(Boolean).join(', ')}`;
        }
      }
    }

    if (context) {
      systemPrompt += `\n\nAdditional context: ${context}`;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`OpenAI API error: ${JSON.stringify(errorData)}`);
      return c.json({ error: 'Failed to get AI response' }, 500);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Store chat message
    const chatId = crypto.randomUUID();
    const chatMessage = {
      id: chatId,
      groupId: groupId || null,
      userId: user.id,
      userMessage: message,
      aiResponse,
      timestamp: new Date().toISOString()
    };

    await kv.set(`chat:${chatId}`, chatMessage);

    // Add to group's chat history if groupId provided
    if (groupId) {
      const group = await kv.get(`group:${groupId}`);
      if (group) {
        const updatedGroup = { 
          ...group, 
          chatHistory: [...(group.chatHistory || []), chatId] 
        };
        await kv.set(`group:${groupId}`, updatedGroup);
      }
    }

    return c.json({ response: aiResponse, chatId });
  } catch (error) {
    console.log(`Chat error: ${error}`);
    return c.json({ error: 'Failed to process chat message' }, 500);
  }
});

app.get('/make-server-d40630a2/chat/:groupId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    const group = await kv.get(`group:${groupId}`);
    
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    if (!group.members.includes(user.id)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const chatIds = group.chatHistory || [];
    const chats = await Promise.all(
      chatIds.map(async (chatId: string) => await kv.get(`chat:${chatId}`))
    );

    // Get user names for chat messages
    const chatsWithUserNames = await Promise.all(
      chats.filter(Boolean).map(async (chat: any) => {
        const userProfile = await kv.get(`user:${chat.userId}`);
        return {
          ...chat,
          userName: userProfile?.name || 'Unknown User'
        };
      })
    );

    return c.json({ chats: chatsWithUserNames });
  } catch (error) {
    console.log(`Get chat history error: ${error}`);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }
});

Deno.serve(app.fetch);
