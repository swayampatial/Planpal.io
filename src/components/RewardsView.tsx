import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Trophy, Award, Star, Gift, Ticket, DollarSign, Sparkles, Copy, Check } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

export const RewardsView: React.FC = () => {
  const { accessToken } = useAuth();
  const [rewards, setRewards] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/rewards`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards);
      } else {
        toast.error('Failed to load rewards');
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
      toast.error('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-purple-300">Loading rewards...</div>
      </div>
    );
  }

  const nextLevelPoints = rewards.level * 50;
  const currentLevelPoints = (rewards.level - 1) * 50;
  const pointsInLevel = rewards.points - currentLevelPoints;
  const pointsToNextLevel = nextLevelPoints - rewards.points;
  const progressPercentage = (pointsInLevel / (nextLevelPoints - currentLevelPoints)) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-purple-200">Rewards & Achievements</h2>
        <p className="text-purple-300/70 text-sm mt-1">Earn rewards for using PlanPal and planning events</p>
      </div>

      {/* Points Overview */}
      <Card className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-purple-500/50 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
        <CardHeader>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <CardTitle className="text-purple-100 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Level {rewards.level}
              </CardTitle>
              <CardDescription className="text-purple-200/70 mt-1">
                {pointsToNextLevel} points to next level
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl text-purple-100">{rewards.points}</div>
              <div className="text-sm text-purple-200/70">Total Points</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-purple-200/70">
              <span>Progress to Level {rewards.level + 1}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-3 bg-purple-950/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {rewards.badges && rewards.badges.length > 0 && (
        <Card className="bg-gray-900/90 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-200 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Your Badges
            </CardTitle>
            <CardDescription className="text-purple-300/70">
              Achievements you've unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {rewards.badges.map((badge: string, index: number) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4 text-center"
                >
                  <Star className="w-8 h-8 mx-auto mb-2 text-yellow-400 fill-yellow-400" />
                  <p className="text-purple-200 text-sm">{badge}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movie Discounts */}
      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Movie Ticket Discounts
          </CardTitle>
          <CardDescription className="text-purple-300/70">
            Exclusive discounts on movie tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rewards.movieDiscounts?.map((discount: any, index: number) => (
            <div
              key={index}
              className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-purple-200">{discount.provider}</h4>
                  <p className="text-purple-300/70 text-sm mt-1">{discount.discount}</p>
                </div>
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                  <Gift className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center gap-2 bg-gray-900/50 rounded px-3 py-2">
                <code className="flex-1 text-purple-300">{discount.code}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyCode(discount.code)}
                  className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                >
                  {copiedCode === discount.code ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cashback */}
      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cashback Rewards
          </CardTitle>
          <CardDescription className="text-purple-300/70">
            Earn cashback on your activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-lg p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <div className="text-3xl text-green-300 mb-1">
              ${rewards.cashback.toFixed(2)}
            </div>
            <p className="text-green-300/70 text-sm">Available Cashback</p>
            <p className="text-green-300/50 text-xs mt-2">
              Earn $0.10 for every reward point
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How to Earn */}
      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            How to Earn More Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300">+10</span>
              </div>
              <div>
                <p className="text-purple-200">Join a Group</p>
                <p className="text-purple-300/70 text-sm">Create or join event planning groups</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300">+5</span>
              </div>
              <div>
                <p className="text-purple-200">Create a Poll</p>
                <p className="text-purple-300/70 text-sm">Help your group make decisions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300">+2</span>
              </div>
              <div>
                <p className="text-purple-200">Vote on Polls</p>
                <p className="text-purple-300/70 text-sm">Participate in group decisions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
