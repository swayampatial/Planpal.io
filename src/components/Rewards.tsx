import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Coins, Film, DollarSign, Gift, Sparkles, CheckCircle } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface RewardsProps {
  user: any;
  profile: any;
  onPointsUpdate: () => void;
}

interface Redemption {
  id: string;
  type: string;
  points: number;
  redeemedAt: string;
}

const rewardsCatalog = [
  {
    id: "movie-ticket-10",
    name: "$10 Movie Ticket",
    description: "Get $10 off your next movie ticket",
    points: 500,
    icon: Film,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "movie-ticket-15",
    name: "$15 Movie Ticket",
    description: "Get $15 off your next movie ticket",
    points: 750,
    icon: Film,
    color: "from-pink-500 to-purple-500",
  },
  {
    id: "cashback-5",
    name: "$5 Cashback",
    description: "Redeem for $5 cashback",
    points: 300,
    icon: DollarSign,
    color: "from-green-500 to-teal-500",
  },
  {
    id: "cashback-10",
    name: "$10 Cashback",
    description: "Redeem for $10 cashback",
    points: 600,
    icon: DollarSign,
    color: "from-teal-500 to-green-500",
  },
  {
    id: "gift-card-25",
    name: "$25 Gift Card",
    description: "Redeem for a $25 gift card",
    points: 1500,
    icon: Gift,
    color: "from-yellow-500 to-orange-500",
  },
];

const pointsActivities = [
  { action: "Create a group", points: 50 },
  { action: "Join a group", points: 25 },
  { action: "Create an event", points: 30 },
  { action: "Create a poll", points: 20 },
  { action: "Vote on a poll", points: 5 },
  { action: "RSVP to an event", points: 10 },
];

export function Rewards({ user, profile, onPointsUpdate }: RewardsProps) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    fetchRedemptions();
  }, [user.id]);

  const fetchRedemptions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/rewards/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRedemptions(data.redemptions || []);
      }
    } catch (error) {
      console.error("Error fetching redemptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: typeof rewardsCatalog[0]) => {
    if (profile.points < reward.points) {
      alert("Not enough points to redeem this reward!");
      return;
    }

    if (!confirm(`Redeem ${reward.name} for ${reward.points} points?`)) {
      return;
    }

    setRedeeming(reward.id);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/rewards/${user.id}/redeem`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            rewardType: reward.name,
            pointsCost: reward.points,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to redeem reward");
      }

      const data = await response.json();
      alert(`🎉 Congratulations! You've redeemed ${reward.name}! Check your email for details.`);
      
      fetchRedemptions();
      onPointsUpdate();
    } catch (error) {
      console.error("Redeem error:", error);
      alert("Failed to redeem reward. Please try again.");
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Points Balance */}
      <Card className="neon-glow-strong border-purple-500/30 bg-gradient-neon">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Coins className="w-12 h-12 text-yellow-300" />
              <span className="text-5xl font-bold text-white">{profile?.points || 0}</span>
            </div>
            <p className="text-white/90 text-lg">Available Points</p>
          </div>
        </CardContent>
      </Card>

      {/* Earn Points */}
      <Card className="neon-glow border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-200">
            <Sparkles className="w-5 h-5" />
            Earn Points
          </CardTitle>
          <CardDescription className="text-purple-400">
            Get points by using PlanPal!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {pointsActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-purple-900/30 rounded-lg border border-purple-500/20"
              >
                <span className="text-purple-200">{activity.action}</span>
                <Badge className="bg-purple-600 text-white">
                  +{activity.points} pts
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rewards Catalog */}
      <Card className="neon-glow border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-200">
            <Gift className="w-5 h-5" />
            Rewards Catalog
          </CardTitle>
          <CardDescription className="text-purple-400">
            Redeem your points for amazing rewards!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {rewardsCatalog.map((reward) => {
              const Icon = reward.icon;
              const canAfford = profile?.points >= reward.points;

              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border transition-all ${
                    canAfford
                      ? "border-purple-500/50 neon-glow hover:neon-glow-strong cursor-pointer"
                      : "border-purple-500/20 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${reward.color} flex items-center justify-center neon-glow`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-purple-200 font-medium">{reward.name}</h4>
                      <p className="text-sm text-purple-400">{reward.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-purple-200">{reward.points} points</span>
                    </div>
                    
                    <Button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || redeeming === reward.id}
                      size="sm"
                      className={canAfford ? "gradient-neon neon-glow" : ""}
                    >
                      {redeeming === reward.id ? "Redeeming..." : "Redeem"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <Card className="neon-glow border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-200">
              <CheckCircle className="w-5 h-5" />
              Redemption History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="flex items-center justify-between p-3 bg-purple-900/30 rounded-lg border border-purple-500/20"
                >
                  <div>
                    <p className="text-purple-200">{redemption.type}</p>
                    <p className="text-xs text-purple-400">
                      {new Date(redemption.redeemedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">-{redemption.points} pts</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
