import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus, Users, Lock, Calendar } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { GroupDetail } from './GroupDetail';
import { toast } from 'sonner@2.0.3';

export const GroupsView: React.FC = () => {
  const { accessToken } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  
  // Create group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPassword, setNewGroupPassword] = useState('');
  
  // Join group form
  const [joinGroupId, setJoinGroupId] = useState('');
  const [joinGroupPassword, setJoinGroupPassword] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/groups`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/groups/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            name: newGroupName,
            description: newGroupDescription,
            password: newGroupPassword
          })
        }
      );

      if (response.ok) {
        toast.success('Group created successfully!');
        setCreateDialogOpen(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupPassword('');
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/groups/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            groupId: joinGroupId,
            password: joinGroupPassword
          })
        }
      );

      if (response.ok) {
        toast.success('Joined group successfully!');
        setJoinDialogOpen(false);
        setJoinGroupId('');
        setJoinGroupPassword('');
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      toast.error('Failed to join group');
    }
  };

  if (selectedGroup) {
    return <GroupDetail groupId={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-purple-300">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-200">Your Groups</h2>
          <p className="text-purple-300/70 text-sm mt-1">Manage your event planning groups</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Users className="w-4 h-4 mr-2" />
                Join Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-purple-500/30">
              <DialogHeader>
                <DialogTitle className="text-purple-200">Join a Group</DialogTitle>
                <DialogDescription className="text-purple-300/70">
                  Enter the group ID and password to join
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupId" className="text-purple-200">Group ID</Label>
                  <Input
                    id="groupId"
                    value={joinGroupId}
                    onChange={(e) => setJoinGroupId(e.target.value)}
                    placeholder="Enter group ID"
                    required
                    className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joinPassword" className="text-purple-200">Password</Label>
                  <Input
                    id="joinPassword"
                    type="password"
                    value={joinGroupPassword}
                    onChange={(e) => setJoinGroupPassword(e.target.value)}
                    placeholder="Enter group password"
                    required
                    className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Join Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-purple-500/30">
              <DialogHeader>
                <DialogTitle className="text-purple-200">Create New Group</DialogTitle>
                <DialogDescription className="text-purple-300/70">
                  Set up a new group for planning events with friends
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-purple-200">Group Name</Label>
                  <Input
                    id="name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Movie Night Squad"
                    required
                    className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-purple-200">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe your group..."
                    className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-purple-200">Group Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newGroupPassword}
                    onChange={(e) => setNewGroupPassword(e.target.value)}
                    placeholder="Set a password for the group"
                    required
                    className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-purple-300/60">Members will need this password to join</p>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="bg-gray-900/90 border-purple-500/30">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-purple-400 mb-4" />
            <h3 className="text-purple-200 mb-2">No Groups Yet</h3>
            <p className="text-purple-300/70 mb-6">Create or join a group to start planning events</p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
              <Button
                onClick={() => setJoinDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Join Group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="bg-gray-900/90 border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer group"
              onClick={() => setSelectedGroup(group.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-purple-200 group-hover:text-purple-100 transition-colors">
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <CardDescription className="text-purple-300/70 mt-1">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <Lock className="w-3 h-3 mr-1" />
                    {group.members?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-purple-300/70">
                  <Calendar className="w-4 h-4" />
                  {group.polls?.length || 0} active polls
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <p className="text-xs text-purple-300/60 mr-2">Group ID:</p>
                  <code className="text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
                    {group.id.slice(0, 8)}...
                  </code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
