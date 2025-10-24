import { Coffee, Mountain, UtensilsCrossed, Heart, Ghost, Drama } from "lucide-react";
import { Button } from "./ui/button";

interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodSelect: (mood: string) => void;
}

const moods = [
  { id: "chill", label: "Chill", icon: Coffee, color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { id: "adventurous", label: "Adventurous", icon: Mountain, color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { id: "foodie", label: "Foodie", icon: UtensilsCrossed, color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { id: "romantic", label: "Romantic", icon: Heart, color: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
  { id: "scary", label: "Scary", icon: Ghost, color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { id: "dramatic", label: "Dramatic", icon: Drama, color: "bg-red-100 text-red-700 hover:bg-red-200" },
];

export function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-purple-600">What's the vibe?</p>
      <div className="grid grid-cols-3 gap-2">
        {moods.map((mood) => {
          const Icon = mood.icon;
          return (
            <Button
              key={mood.id}
              type="button"
              variant={selectedMood === mood.id ? "default" : "outline"}
              className={`${
                selectedMood === mood.id
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : mood.color
              }`}
              onClick={() => onMoodSelect(mood.id)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {mood.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
