import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Users, Plus, Calendar, Trophy, Sparkles, LogOut, User, Bot } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { GroupsView } from './GroupsView';
import { ProfileView } from './ProfileView';
import { SuggestionsView } from './SuggestionsView';
import { RewardsView } from './RewardsView';
import { PlanPalBot } from './PlanPalBot';

type View = 'groups' | 'profile' | 'suggestions' | 'rewards';

export const Dashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('groups');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFloatingBot, setShowFloatingBot] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/profile`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'groups':
        return <GroupsView />;
      case 'profile':
        return <ProfileView profile={profile} onProfileUpdate={fetchProfile} />;
      case 'suggestions':
        return <SuggestionsView />;
      case 'rewards':
        return <RewardsView />;
      default:
        return <GroupsView />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-purple-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-purple-500/30 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-purple-200">PlanPal</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-purple-300">
                <User className="w-4 h-4" />
                <span className="text-sm">{profile?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Card className="bg-gray-900/90 border-purple-500/30 backdrop-blur-sm sticky top-24">
              <CardContent className="p-4 space-y-2">
                <Button
                  variant={currentView === 'groups' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    currentView === 'groups'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/20'
                  }`}
                  onClick={() => setCurrentView('groups')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Groups
                </Button>

                <Button
                  variant={currentView === 'suggestions' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    currentView === 'suggestions'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/20'
                  }`}
                  onClick={() => setCurrentView('suggestions')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Suggestions
                </Button>

                <Button
                  variant={currentView === 'rewards' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    currentView === 'rewards'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/20'
                  }`}
                  onClick={() => setCurrentView('rewards')}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Rewards
                </Button>

                <Button
                  variant={currentView === 'profile' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    currentView === 'profile'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/20'
                  }`}
                  onClick={() => setCurrentView('profile')}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {renderView()}
          </main>
        </div>
      </div>

      {/* Floating Bot Button */}
      {!showFloatingBot && (
        <Button
          onClick={() => setShowFloatingBot(true)}
          className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg z-50 flex items-center justify-center"
        >
          <Bot className="w-6 h-6" />
        </Button>
      )}

      {/* Floating Bot */}
      {showFloatingBot && (
        <PlanPalBot
          onClose={() => setShowFloatingBot(false)}
          context="General assistance for PlanPal. Help users with questions about the app, suggest ideas, or provide recommendations."
        />
      )}
    </div>
  );
};
