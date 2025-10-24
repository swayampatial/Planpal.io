import { Star, MapPin, DollarSign, Film } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";


interface Suggestion {
  id: string | number;
  name?: string;
  title?: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types?: string[];
  overview?: string;
  releaseDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  type: "place" | "movie";
  onAddToPoll?: (suggestion: Suggestion) => void;
}

export function SuggestionCard({ suggestion, type, onAddToPoll }: SuggestionCardProps) {
  const displayName = type === "movie" ? suggestion.title : suggestion.name;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {type === "movie" && suggestion.posterPath && (
        <div className="relative h-48 bg-gray-200">
          <img
            src={suggestion.posterPath}
            alt={displayName || "Movie poster"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-2">
          <span className="text-purple-900">{displayName}</span>
          {type === "place" && suggestion.rating && (
            <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              {suggestion.rating.toFixed(1)}
            </Badge>
          )}
          {type === "movie" && suggestion.rating && (
            <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <Film className="w-3 h-3" />
              {suggestion.rating.toFixed(1)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {type === "place" && (
          <>
            {suggestion.address && (
              <div className="flex items-start gap-2 text-sm text-purple-600">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{suggestion.address}</span>
              </div>
            )}
            
            {suggestion.priceLevel && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <DollarSign className="w-4 h-4" />
                <span>{"$".repeat(suggestion.priceLevel)}</span>
              </div>
            )}
            
            {suggestion.userRatingsTotal && (
              <p className="text-xs text-purple-500">
                {suggestion.userRatingsTotal.toLocaleString()} reviews
              </p>
            )}
            
            {suggestion.types && suggestion.types.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestion.types.slice(0, 3).map((type, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {type.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
        
        {type === "movie" && (
          <>
            {suggestion.overview && (
              <p className="text-sm text-purple-600 line-clamp-3">
                {suggestion.overview}
              </p>
            )}
            
            {suggestion.releaseDate && (
              <p className="text-xs text-purple-500">
                Release: {new Date(suggestion.releaseDate).getFullYear()}
              </p>
            )}
          </>
        )}
        
        {onAddToPoll && (
          <Button
            onClick={() => onAddToPoll(suggestion)}
            className="w-full"
            variant="outline"
          >
            Add to Poll
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
