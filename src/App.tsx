import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Users, Calendar, Bot, Trophy, UserCircle, LogOut, Coins } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "./components/Auth";
import { CreateGroup } from "./components/CreateGroup";
import { GroupCard } from "./components/GroupCard";
import { EventPlanner } from "./components/EventPlanner";
import { PlanPalBot } from "./components/PlanPalBot";
import { Profile } from "./components/Profile";
import { Rewards } from "./components/Rewards";
import { projectId, publicAnonKey } from "./utils/supabase/info";

interface Group {
  id: string;
  name: string;
  members: string[];
  password?: string | null;
  createdAt: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState("groups");
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchProfile();
    }
  }, [user]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch profile
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/profile/${session.user.id}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setCheckingSession(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/profile/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/groups`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGroups(data);
        if (data.length > 0 && !selectedGroup) {
          setSelectedGroup(data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (authUser: any, authProfile: any) => {
    setUser(authUser);
    setProfile(authProfile);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setGroups([]);
    setSelectedGroup(null);
  };

  const handleGroupCreated = (group: Group) => {
    setGroups([...groups, group]);
    setSelectedGroup(group);
    setActiveTab("events");
    fetchProfile(); // Refresh to show new points
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-purple-900/30 backdrop-blur-sm border-b border-purple-500/30 sticky top-0 z-50 neon-glow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-neon rounded-xl flex items-center justify-center neon-pulse">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-purple-100 neon-text">PlanPal</h1>
                <p className="text-sm text-purple-300">Smart Event Planning</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Points Display */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-900/50 rounded-full border border-purple-500/30 neon-glow">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-purple-100">{profile?.points || 0}</span>
              </div>
              
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-purple-500 neon-glow cursor-pointer" onClick={() => setActiveTab("profile")}>
                  <AvatarImage src={profile?.profileImage || undefined} alt={profile?.name} />
                  <AvatarFallback className="bg-gradient-neon text-white">
                    {profile?.name ? getInitials(profile.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSignOut}
                  className="border-purple-500/30"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-5 bg-purple-900/30 backdrop-blur-sm border border-purple-500/30 neon-glow">
            <TabsTrigger value="groups" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="bot" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Bot</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-6">
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 neon-glow">
              <h2 className="text-purple-100 mb-6">Create or Select a Group</h2>
              <CreateGroup onGroupCreated={handleGroupCreated} currentUserId={user.id} />
            </div>

            <div className="space-y-4">
              <h3 className="text-purple-100">Your Groups</h3>
              {loading ? (
                <div className="text-center py-12 text-purple-300">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-purple-900/20 rounded-2xl border border-purple-500/30">
                  <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <p className="text-purple-300">No groups yet. Create your first group above!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isSelected={selectedGroup?.id === group.id}
                      onSelect={() => setSelectedGroup(group)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events">
            {selectedGroup ? (
              <EventPlanner group={selectedGroup} currentUserId={user.id} onPointsEarned={fetchProfile} />
            ) : (
              <div className="text-center py-12 bg-purple-900/20 rounded-2xl border border-purple-500/30">
                <Calendar className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-purple-300">Select a group first to start planning events!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bot">
            {selectedGroup ? (
              <PlanPalBot group={selectedGroup} />
            ) : (
              <div className="text-center py-12 bg-purple-900/20 rounded-2xl border border-purple-500/30">
                <Bot className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-purple-300">Select a group to chat with PlanPal Bot!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rewards">
            <Rewards user={user} profile={profile} onPointsUpdate={fetchProfile} />
          </TabsContent>

          <TabsContent value="profile">
            <Profile user={user} profile={profile} onProfileUpdate={(updatedProfile) => {
              setProfile(updatedProfile);
            }} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
