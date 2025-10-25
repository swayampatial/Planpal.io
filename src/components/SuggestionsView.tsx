import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Film, UtensilsCrossed, MapPin, Star, Heart, Zap, Coffee, Bot } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { PlanPalBot } from './PlanPalBot';

export const SuggestionsView: React.FC = () => {
  const { accessToken } = useAuth();
  const [movies, setMovies] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [mood, setMood] = useState('popular');
  const [placeType, setPlaceType] = useState('restaurant');
  const [location, setLocation] = useState('40.7128,-74.0060'); // NYC default
  const [showBot, setShowBot] = useState(false);

  const fetchMovies = async () => {
    setLoadingMovies(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/suggestions/movies?mood=${mood}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMovies(data.movies);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch movies');
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
      toast.error('Failed to fetch movie suggestions');
    } finally {
      setLoadingMovies(false);
    }
  };

  const fetchPlaces = async () => {
    setLoadingPlaces(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/suggestions/places?type=${placeType}&location=${location}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlaces(data.places);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch places');
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
      toast.error('Failed to fetch place suggestions');
    } finally {
      setLoadingPlaces(false);
    }
  };

  const getMoodIcon = (moodType: string) => {
    switch (moodType) {
      case 'adventurous':
        return <Zap className="w-4 h-4" />;
      case 'chill':
        return <Coffee className="w-4 h-4" />;
      case 'foodie':
        return <UtensilsCrossed className="w-4 h-4" />;
      default:
        return <Heart className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-200">Smart Suggestions</h2>
          <p className="text-purple-300/70 text-sm mt-1">Discover movies, restaurants, and places to hang out</p>
        </div>
        <Button
          onClick={() => setShowBot(!showBot)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Bot className="w-4 h-4 mr-2" />
          {showBot ? 'Hide' : 'Ask'} PlanPal Bot
        </Button>
      </div>

      {showBot && (
        <Card className="bg-gray-900/90 border-purple-500/30 overflow-hidden">
          <div className="h-[500px]">
            <PlanPalBot
              context="The user is looking for movie and place suggestions. Help them find the perfect options based on their preferences."
              isInline={true}
            />
          </div>
        </Card>
      )}

      <Tabs defaultValue="movies" className="space-y-4">
        <TabsList className="bg-gray-900/90 border border-purple-500/30">
          <TabsTrigger value="movies" className="data-[state=active]:bg-purple-600">
            <Film className="w-4 h-4 mr-2" />
            Movies
          </TabsTrigger>
          <TabsTrigger value="places" className="data-[state=active]:bg-purple-600">
            <MapPin className="w-4 h-4 mr-2" />
            Places
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movies" className="space-y-4">
          <Card className="bg-gray-900/90 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-200">Movie Recommendations</CardTitle>
              <CardDescription className="text-purple-300/70">
                Find the perfect movie based on your mood
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-purple-200">Mood</Label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30">
                      <SelectItem value="popular">Popular</SelectItem>
                      <SelectItem value="adventurous">Adventurous</SelectItem>
                      <SelectItem value="chill">Chill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={fetchMovies}
                    disabled={loadingMovies}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loadingMovies ? 'Loading...' : 'Get Suggestions'}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`cursor-pointer ${mood === 'popular' ? 'bg-purple-600 text-white border-purple-600' : 'border-purple-500/30 text-purple-300'}`}
                  onClick={() => setMood('popular')}
                >
                  <Heart className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
                <Badge
                  variant="outline"
                  className={`cursor-pointer ${mood === 'adventurous' ? 'bg-purple-600 text-white border-purple-600' : 'border-purple-500/30 text-purple-300'}`}
                  onClick={() => setMood('adventurous')}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Adventurous
                </Badge>
                <Badge
                  variant="outline"
                  className={`cursor-pointer ${mood === 'chill' ? 'bg-purple-600 text-white border-purple-600' : 'border-purple-500/30 text-purple-300'}`}
                  onClick={() => setMood('chill')}
                >
                  <Coffee className="w-3 h-3 mr-1" />
                  Chill
                </Badge>
              </div>
            </CardContent>
          </Card>

          {movies.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {movies.map((movie) => (
                <Card key={movie.id} className="bg-gray-900/90 border-purple-500/30 overflow-hidden hover:border-purple-500/50 transition-all">
                  {movie.poster && (
                    <div className="aspect-[2/3] bg-gray-800 overflow-hidden">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-purple-200 line-clamp-2">{movie.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        <Star className="w-3 h-3 mr-1 fill-purple-300" />
                        {movie.rating.toFixed(1)}
                      </Badge>
                      {movie.releaseDate && (
                        <span className="text-xs text-purple-300/60">
                          {new Date(movie.releaseDate).getFullYear()}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-purple-300/70 text-sm line-clamp-3">{movie.overview}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="places" className="space-y-4">
          <Card className="bg-gray-900/90 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-200">Place Recommendations</CardTitle>
              <CardDescription className="text-purple-300/70">
                Find the best restaurants and hangout spots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-purple-200">Type</Label>
                  <Select value={placeType} onValueChange={setPlaceType}>
                    <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30">
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="park">Park</SelectItem>
                      <SelectItem value="movie_theater">Movie Theater</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-purple-200">Location (lat,lng)</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="40.7128,-74.0060"
                    className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={fetchPlaces}
                    disabled={loadingPlaces}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loadingPlaces ? 'Loading...' : 'Get Suggestions'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-purple-300/60">
                Tip: Get your current coordinates from{' '}
                <a
                  href="https://www.latlong.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  latlong.net
                </a>
              </p>
            </CardContent>
          </Card>

          {places.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.map((place) => (
                <Card key={place.id} className="bg-gray-900/90 border-purple-500/30 hover:border-purple-500/50 transition-all">
                  {place.photos && (
                    <div className="aspect-video bg-gray-800 overflow-hidden">
                      <img
                        src={place.photos}
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-purple-200 line-clamp-1">{place.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {place.rating && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          <Star className="w-3 h-3 mr-1 fill-purple-300" />
                          {place.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-purple-300/70 text-sm flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{place.address}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
