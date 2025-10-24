import { Users, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

interface GroupCardProps {
  group: Group;
  isSelected: boolean;
  onSelect: () => void;
}

export function GroupCard({ group, isSelected, onSelect }: GroupCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected
          ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
          : "border-purple-100 hover:border-purple-300"
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-purple-900">{group.name}</span>
          {isSelected && <Check className="w-5 h-5 text-purple-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-purple-600 mb-3">
          <Users className="w-4 h-4" />
          <span>{group.members.length} members</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {group.members.slice(0, 3).map((member, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {member}
            </Badge>
          ))}
          {group.members.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{group.members.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
