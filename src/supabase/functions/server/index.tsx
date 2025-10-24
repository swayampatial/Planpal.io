import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase clients
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Create storage bucket on startup
(async () => {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketName = 'make-dbafed67-profiles';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true
      });
      console.log(`Created storage bucket: ${bucketName}`);
    }
  } catch (error) {
    console.log(`Storage bucket setup: ${error}`);
  }
})();

// Health check endpoint
app.get("/make-server-dbafed67/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== AUTH ROUTES =====

// Sign up
app.post("/make-server-dbafed67/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    
    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm since email server isn't configured
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Create user profile
    const profile = {
      id: data.user.id,
      email: data.user.email,
      name,
      profileImage: null,
      points: 100, // Welcome bonus
      createdAt: new Date().toISOString()
    };

    await kv.set(`profiles:${data.user.id}`, JSON.stringify(profile));
    console.log(`Created user profile: ${data.user.id}`);

    return c.json({ user: data.user, profile });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: `Failed to sign up: ${error}` }, 500);
  }
});

// ===== PROFILE ROUTES =====

// Get user profile
app.get("/make-server-dbafed67/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const profileData = await kv.get(`profiles:${userId}`);
    
    if (!profileData) {
      return c.json({ error: "Profile not found" }, 404);
    }
    
    return c.json(JSON.parse(profileData));
  } catch (error) {
    console.log(`Error fetching profile: ${error}`);
    return c.json({ error: `Failed to fetch profile: ${error}` }, 500);
  }
});

// Update user profile
app.put("/make-server-dbafed67/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { name, profileImage } = body;
    
    const profileData = await kv.get(`profiles:${userId}`);
    if (!profileData) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const profile = JSON.parse(profileData);
    profile.name = name || profile.name;
    profile.profileImage = profileImage !== undefined ? profileImage : profile.profileImage;

    await kv.set(`profiles:${userId}`, JSON.stringify(profile));
    console.log(`Updated profile: ${userId}`);
    return c.json(profile);
  } catch (error) {
    console.log(`Error updating profile: ${error}`);
    return c.json({ error: `Failed to update profile: ${error}` }, 500);
  }
});

// Upload profile image
app.post("/make-server-dbafed67/profile/:userId/upload", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { imageData, fileName } = body;
    
    if (!imageData) {
      return c.json({ error: "Image data is required" }, 400);
    }

    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1] || imageData;
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const filePath = `${userId}/${fileName || Date.now()}.jpg`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('make-dbafed67-profiles')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.log(`Image upload error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('make-dbafed67-profiles')
      .getPublicUrl(filePath);

    // Update profile with image URL
    const profileData = await kv.get(`profiles:${userId}`);
    if (profileData) {
      const profile = JSON.parse(profileData);
      profile.profileImage = publicUrl;
      await kv.set(`profiles:${userId}`, JSON.stringify(profile));
    }

    return c.json({ url: publicUrl });
  } catch (error) {
    console.log(`Error uploading image: ${error}`);
    return c.json({ error: `Failed to upload image: ${error}` }, 500);
  }
});

// ===== REWARDS ROUTES =====

// Get user rewards/points
app.get("/make-server-dbafed67/rewards/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const profileData = await kv.get(`profiles:${userId}`);
    
    if (!profileData) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const profile = JSON.parse(profileData);
    const rewardsData = await kv.get(`rewards:${userId}`) || '{"redemptions":[]}';
    const rewards = JSON.parse(rewardsData);

    return c.json({
      points: profile.points || 0,
      redemptions: rewards.redemptions || []
    });
  } catch (error) {
    console.log(`Error fetching rewards: ${error}`);
    return c.json({ error: `Failed to fetch rewards: ${error}` }, 500);
  }
});

// Redeem reward
app.post("/make-server-dbafed67/rewards/:userId/redeem", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { rewardType, pointsCost } = body;
    
    const profileData = await kv.get(`profiles:${userId}`);
    if (!profileData) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const profile = JSON.parse(profileData);
    
    if (profile.points < pointsCost) {
      return c.json({ error: "Insufficient points" }, 400);
    }

    // Deduct points
    profile.points -= pointsCost;
    await kv.set(`profiles:${userId}`, JSON.stringify(profile));

    // Record redemption
    const rewardsData = await kv.get(`rewards:${userId}`) || '{"redemptions":[]}';
    const rewards = JSON.parse(rewardsData);
    
    const redemption = {
      id: crypto.randomUUID(),
      type: rewardType,
      points: pointsCost,
      redeemedAt: new Date().toISOString()
    };

    rewards.redemptions = rewards.redemptions || [];
    rewards.redemptions.push(redemption);
    
    await kv.set(`rewards:${userId}`, JSON.stringify(rewards));
    console.log(`Reward redeemed: ${userId} - ${rewardType}`);

    return c.json({ redemption, remainingPoints: profile.points });
  } catch (error) {
    console.log(`Error redeeming reward: ${error}`);
    return c.json({ error: `Failed to redeem reward: ${error}` }, 500);
  }
});

// Add points (for completing actions)
app.post("/make-server-dbafed67/rewards/:userId/add", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { points, reason } = body;
    
    const profileData = await kv.get(`profiles:${userId}`);
    if (!profileData) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const profile = JSON.parse(profileData);
    profile.points = (profile.points || 0) + points;
    await kv.set(`profiles:${userId}`, JSON.stringify(profile));

    console.log(`Added ${points} points to ${userId}: ${reason}`);
    return c.json({ points: profile.points });
  } catch (error) {
    console.log(`Error adding points: ${error}`);
    return c.json({ error: `Failed to add points: ${error}` }, 500);
  }
});

// ===== GROUP ROUTES (UPDATED WITH PASSWORD) =====

// Create a new group
app.post("/make-server-dbafed67/groups", async (c) => {
  try {
    const body = await c.req.json();
    const { name, members, password, createdBy } = body;
    
    if (!name || !members || !Array.isArray(members)) {
      return c.json({ error: "Name and members array are required" }, 400);
    }

    const groupId = crypto.randomUUID();
    const group = {
      id: groupId,
      name,
      members,
      password: password || null,
      createdBy,
      createdAt: new Date().toISOString()
    };

    await kv.set(`groups:${groupId}`, JSON.stringify(group));
    console.log(`Created group: ${groupId}`);
    
    // Award points for creating a group
    if (createdBy) {
      const profileData = await kv.get(`profiles:${createdBy}`);
      if (profileData) {
        const profile = JSON.parse(profileData);
        profile.points = (profile.points || 0) + 50;
        await kv.set(`profiles:${createdBy}`, JSON.stringify(profile));
      }
    }

    return c.json(group);
  } catch (error) {
    console.log(`Error creating group: ${error}`);
    return c.json({ error: `Failed to create group: ${error}` }, 500);
  }
});

// Join a group with password
app.post("/make-server-dbafed67/groups/:id/join", async (c) => {
  try {
    const groupId = c.req.param("id");
    const body = await c.req.json();
    const { userId, userName, password } = body;
    
    const groupData = await kv.get(`groups:${groupId}`);
    if (!groupData) {
      return c.json({ error: "Group not found" }, 404);
    }

    const group = JSON.parse(groupData);
    
    // Check password if group is protected
    if (group.password && group.password !== password) {
      return c.json({ error: "Incorrect password" }, 403);
    }

    // Add user to group if not already a member
    if (!group.members.includes(userName)) {
      group.members.push(userName);
      await kv.set(`groups:${groupId}`, JSON.stringify(group));
      
      // Award points for joining a group
      const profileData = await kv.get(`profiles:${userId}`);
      if (profileData) {
        const profile = JSON.parse(profileData);
        profile.points = (profile.points || 0) + 25;
        await kv.set(`profiles:${userId}`, JSON.stringify(profile));
      }
    }

    return c.json(group);
  } catch (error) {
    console.log(`Error joining group: ${error}`);
    return c.json({ error: `Failed to join group: ${error}` }, 500);
  }
});

// Get all groups
app.get("/make-server-dbafed67/groups", async (c) => {
  try {
    const groups = await kv.getByPrefix("groups:");
    const parsedGroups = groups.map(g => JSON.parse(g));
    return c.json(parsedGroups);
  } catch (error) {
    console.log(`Error fetching groups: ${error}`);
    return c.json({ error: `Failed to fetch groups: ${error}` }, 500);
  }
});

// Get a specific group
app.get("/make-server-dbafed67/groups/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const group = await kv.get(`groups:${id}`);
    
    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }
    
    return c.json(JSON.parse(group));
  } catch (error) {
    console.log(`Error fetching group: ${error}`);
    return c.json({ error: `Failed to fetch group: ${error}` }, 500);
  }
});

// ===== EVENT ROUTES =====

// Create a new event
app.post("/make-server-dbafed67/events", async (c) => {
  try {
    const body = await c.req.json();
    const { groupId, title, date, location, type, mood, createdBy } = body;
    
    if (!groupId || !title) {
      return c.json({ error: "GroupId and title are required" }, 400);
    }

    const eventId = crypto.randomUUID();
    const event = {
      id: eventId,
      groupId,
      title,
      date,
      location,
      type,
      mood,
      createdAt: new Date().toISOString()
    };

    await kv.set(`events:${eventId}`, JSON.stringify(event));
    console.log(`Created event: ${eventId}`);
    
    // Award points for creating an event
    if (createdBy) {
      const profileData = await kv.get(`profiles:${createdBy}`);
      if (profileData) {
        const profile = JSON.parse(profileData);
        profile.points = (profile.points || 0) + 30;
        await kv.set(`profiles:${createdBy}`, JSON.stringify(profile));
      }
    }

    return c.json(event);
  } catch (error) {
    console.log(`Error creating event: ${error}`);
    return c.json({ error: `Failed to create event: ${error}` }, 500);
  }
});

// Get events for a group
app.get("/make-server-dbafed67/events/group/:groupId", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    const allEvents = await kv.getByPrefix("events:");
    const groupEvents = allEvents
      .map(e => JSON.parse(e))
      .filter(e => e.groupId === groupId);
    
    return c.json(groupEvents);
  } catch (error) {
    console.log(`Error fetching events: ${error}`);
    return c.json({ error: `Failed to fetch events: ${error}` }, 500);
  }
});

// Get a specific event
app.get("/make-server-dbafed67/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const event = await kv.get(`events:${id}`);
    
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }
    
    return c.json(JSON.parse(event));
  } catch (error) {
    console.log(`Error fetching event: ${error}`);
    return c.json({ error: `Failed to fetch event: ${error}` }, 500);
  }
});

// ===== POLL ROUTES =====

// Create a poll
app.post("/make-server-dbafed67/polls", async (c) => {
  try {
    const body = await c.req.json();
    const { eventId, question, options, createdBy } = body;
    
    if (!eventId || !question || !options || !Array.isArray(options)) {
      return c.json({ error: "EventId, question, and options array are required" }, 400);
    }

    const pollId = crypto.randomUUID();
    const poll = {
      id: pollId,
      eventId,
      question,
      options: options.map(opt => ({ text: opt, votes: [] })),
      createdAt: new Date().toISOString()
    };

    await kv.set(`polls:${pollId}`, JSON.stringify(poll));
    console.log(`Created poll: ${pollId}`);
    
    // Award points for creating a poll
    if (createdBy) {
      const profileData = await kv.get(`profiles:${createdBy}`);
      if (profileData) {
        const profile = JSON.parse(profileData);
        profile.points = (profile.points || 0) + 20;
        await kv.set(`profiles:${createdBy}`, JSON.stringify(profile));
      }
    }

    return c.json(poll);
  } catch (error) {
    console.log(`Error creating poll: ${error}`);
    return c.json({ error: `Failed to create poll: ${error}` }, 500);
  }
});

// Vote on a poll
app.post("/make-server-dbafed67/polls/:id/vote", async (c) => {
  try {
    const pollId = c.req.param("id");
    const body = await c.req.json();
    const { optionIndex, userId, emoji } = body;
    
    const pollData = await kv.get(`polls:${pollId}`);
    if (!pollData) {
      return c.json({ error: "Poll not found" }, 404);
    }

    const poll = JSON.parse(pollData);
    
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return c.json({ error: "Invalid option index" }, 400);
    }

    // Add vote with emoji reaction
    poll.options[optionIndex].votes.push({
      userId,
      emoji: emoji || "👍",
      timestamp: new Date().toISOString()
    });

    await kv.set(`polls:${pollId}`, JSON.stringify(poll));
    console.log(`Vote added to poll: ${pollId}`);
    
    // Award points for voting
    const profileData = await kv.get(`profiles:${userId}`);
    if (profileData) {
      const profile = JSON.parse(profileData);
      profile.points = (profile.points || 0) + 5;
      await kv.set(`profiles:${userId}`, JSON.stringify(profile));
    }

    return c.json(poll);
  } catch (error) {
    console.log(`Error voting on poll: ${error}`);
    return c.json({ error: `Failed to vote: ${error}` }, 500);
  }
});

// Get polls for an event
app.get("/make-server-dbafed67/polls/event/:eventId", async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const allPolls = await kv.getByPrefix("polls:");
    const eventPolls = allPolls
      .map(p => JSON.parse(p))
      .filter(p => p.eventId === eventId);
    
    return c.json(eventPolls);
  } catch (error) {
    console.log(`Error fetching polls: ${error}`);
    return c.json({ error: `Failed to fetch polls: ${error}` }, 500);
  }
});

// ===== RSVP ROUTES =====

// Create or update RSVP
app.post("/make-server-dbafed67/rsvps", async (c) => {
  try {
    const body = await c.req.json();
    const { eventId, userId, status } = body;
    
    if (!eventId || !userId || !status) {
      return c.json({ error: "EventId, userId, and status are required" }, 400);
    }

    const rsvp = {
      eventId,
      userId,
      status,
      timestamp: new Date().toISOString()
    };

    await kv.set(`rsvps:${eventId}:${userId}`, JSON.stringify(rsvp));
    console.log(`RSVP created for event ${eventId} by user ${userId}`);
    
    // Award points for RSVPing
    const profileData = await kv.get(`profiles:${userId}`);
    if (profileData) {
      const profile = JSON.parse(profileData);
      profile.points = (profile.points || 0) + 10;
      await kv.set(`profiles:${userId}`, JSON.stringify(profile));
    }

    return c.json(rsvp);
  } catch (error) {
    console.log(`Error creating RSVP: ${error}`);
    return c.json({ error: `Failed to create RSVP: ${error}` }, 500);
  }
});

// Get RSVPs for an event
app.get("/make-server-dbafed67/rsvps/event/:eventId", async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const rsvps = await kv.getByPrefix(`rsvps:${eventId}:`);
    const parsedRsvps = rsvps.map(r => JSON.parse(r));
    return c.json(parsedRsvps);
  } catch (error) {
    console.log(`Error fetching RSVPs: ${error}`);
    return c.json({ error: `Failed to fetch RSVPs: ${error}` }, 500);
  }
});

// ===== GOOGLE PLACES API ROUTES =====

// Search for places (restaurants, cafes, activities)
app.post("/make-server-dbafed67/places/search", async (c) => {
  try {
    const body = await c.req.json();
    const { location, type, mood } = body;
    
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return c.json({ error: "Google Places API key not configured" }, 500);
    }

    // Adjust search type based on mood
    let searchType = type || "restaurant";
    if (mood === "chill") {
      searchType = "cafe";
    } else if (mood === "adventurous") {
      searchType = "tourist_attraction";
    } else if (mood === "foodie") {
      searchType = "restaurant";
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=5000&type=${searchType}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.log(`Google Places API error: ${data.status} - ${data.error_message}`);
      return c.json({ error: `Places API error: ${data.status}` }, 500);
    }

    // Return top 10 results with relevant info
    const places = (data.results || []).slice(0, 10).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      types: place.types,
      location: place.geometry.location,
      photo: place.photos?.[0]?.photo_reference
    }));

    return c.json(places);
  } catch (error) {
    console.log(`Error searching places: ${error}`);
    return c.json({ error: `Failed to search places: ${error}` }, 500);
  }
});

// Get place details
app.get("/make-server-dbafed67/places/:placeId", async (c) => {
  try {
    const placeId = c.req.param("placeId");
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    
    if (!apiKey) {
      return c.json({ error: "Google Places API key not configured" }, 500);
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== "OK") {
      console.log(`Google Places API error: ${data.status}`);
      return c.json({ error: `Places API error: ${data.status}` }, 500);
    }

    return c.json(data.result);
  } catch (error) {
    console.log(`Error fetching place details: ${error}`);
    return c.json({ error: `Failed to fetch place details: ${error}` }, 500);
  }
});

// ===== TMDB MOVIE API ROUTES =====

// Search for movies
app.get("/make-server-dbafed67/movies/search", async (c) => {
  try {
    const query = c.req.query("query");
    const apiKey = Deno.env.get("TMDB_API_KEY");
    
    if (!apiKey) {
      return c.json({ error: "TMDB API key not configured" }, 500);
    }

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query || "")}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const movies = (data.results || []).slice(0, 10).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.release_date,
      rating: movie.vote_average,
      posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null
    }));

    return c.json(movies);
  } catch (error) {
    console.log(`Error searching movies: ${error}`);
    return c.json({ error: `Failed to search movies: ${error}` }, 500);
  }
});

// Get popular/trending movies
app.get("/make-server-dbafed67/movies/popular", async (c) => {
  try {
    const apiKey = Deno.env.get("TMDB_API_KEY");
    
    if (!apiKey) {
      return c.json({ error: "TMDB API key not configured" }, 500);
    }

    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const movies = (data.results || []).slice(0, 10).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.release_date,
      rating: movie.vote_average,
      posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null
    }));

    return c.json(movies);
  } catch (error) {
    console.log(`Error fetching popular movies: ${error}`);
    return c.json({ error: `Failed to fetch popular movies: ${error}` }, 500);
  }
});

// Get movies by mood
app.get("/make-server-dbafed67/movies/mood/:mood", async (c) => {
  try {
    const mood = c.req.param("mood");
    const apiKey = Deno.env.get("TMDB_API_KEY");
    
    if (!apiKey) {
      return c.json({ error: "TMDB API key not configured" }, 500);
    }

    // Map moods to genres
    const moodToGenre: Record<string, number> = {
      chill: 35, // Comedy
      adventurous: 12, // Adventure
      romantic: 10749, // Romance
      scary: 27, // Horror
      dramatic: 18 // Drama
    };

    const genreId = moodToGenre[mood] || 28; // Default to Action
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const movies = (data.results || []).slice(0, 10).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.release_date,
      rating: movie.vote_average,
      posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null
    }));

    return c.json(movies);
  } catch (error) {
    console.log(`Error fetching movies by mood: ${error}`);
    return c.json({ error: `Failed to fetch movies by mood: ${error}` }, 500);
  }
});

// ===== PLANPAL BOT ROUTES =====

// Get smart suggestions from PlanPal bot
app.post("/make-server-dbafed67/planpal/suggest", async (c) => {
  try {
    const body = await c.req.json();
    const { groupId, eventType, mood, memberLocations } = body;
    
    // Generate contextual suggestions based on input
    const suggestions = [];
    
    if (eventType === "movie") {
      suggestions.push({
        type: "message",
        text: `🎬 Hey! Based on your group's vibe, I've got some movie suggestions!`,
        timestamp: new Date().toISOString()
      });
    } else if (eventType === "food") {
      suggestions.push({
        type: "message",
        text: `🍽️ Looking for the perfect spot to eat? Let me help!`,
        timestamp: new Date().toISOString()
      });
    } else if (eventType === "hangout") {
      suggestions.push({
        type: "message",
        text: `🎉 Time to plan an awesome hangout! Here's what I recommend:`,
        timestamp: new Date().toISOString()
      });
    }

    // Add mood-based suggestions
    if (mood === "chill") {
      suggestions.push({
        type: "message",
        text: `For a chill vibe, how about a cozy café or a casual movie night? ☕`,
        timestamp: new Date().toISOString()
      });
    } else if (mood === "adventurous") {
      suggestions.push({
        type: "message",
        text: `Adventure time! 🏔️ Check out nearby hiking spots, escape rooms, or action movies!`,
        timestamp: new Date().toISOString()
      });
    } else if (mood === "foodie") {
      suggestions.push({
        type: "message",
        text: `Foodie mode activated! 🍕 I'll find the best-rated restaurants near all of you.`,
        timestamp: new Date().toISOString()
      });
    }

    return c.json({ suggestions });
  } catch (error) {
    console.log(`Error getting PlanPal suggestions: ${error}`);
    return c.json({ error: `Failed to get suggestions: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);
