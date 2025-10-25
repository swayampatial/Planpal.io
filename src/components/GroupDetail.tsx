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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Plus, Users, ThumbsUp, Film, UtensilsCrossed, MapPin, Bot } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { PlanPalBot } from './PlanPalBot';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onBack }) => {
  const { accessToken } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPollDialogOpen, setCreatePollDialogOpen] = useState(false);
  
  // Poll creation
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollType, setPollType] = useState<'general' | 'movie' | 'restaurant' | 'location'>('general');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    fetchGroupDetail();
  }, [groupId]);

  const fetchGroupDetail = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/groups/${groupId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
        
        // Fetch all polls
        const pollPromises = (data.group.polls || []).map((pollId: string) =>
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/polls/${pollId}`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          ).then(res => res.ok ? res.json() : null)
        );
        
        const pollResults = await Promise.all(pollPromises);
        setPolls(pollResults.filter(p => p !== null).map(p => p.poll));
      }
    } catch (error) {
      console.error('Failed to fetch group detail:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.filter(opt => opt.trim() !== '');
    
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/polls/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            groupId,
            question: pollQuestion,
            type: pollType,
            options: validOptions.map(opt => ({ text: opt }))
          })
        }
      );

      if (response.ok) {
        toast.success('Poll created successfully!');
        setCreatePollDialogOpen(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        fetchGroupDetail();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create poll');
      }
    } catch (error) {
      console.error('Failed to create poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/polls/${pollId}/vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ optionId })
        }
      );

      if (response.ok) {
        toast.success('Vote recorded!');
        fetchGroupDetail();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to vote');
    }
  };

  const handleReact = async (pollId: string, optionId: string, emoji: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/polls/${pollId}/react`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ optionId, emoji })
        }
      );

      if (response.ok) {
        fetchGroupDetail();
      }
    } catch (error) {
      console.error('Failed to react:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-purple-300">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-purple-300">Group not found</p>
        <Button onClick={onBack} className="mt-4 bg-purple-600 hover:bg-purple-700">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-purple-200">{group.name}</CardTitle>
              {group.description && (
                <CardDescription className="text-purple-300/70 mt-2">
                  {group.description}
                </CardDescription>
              )}
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {group.memberDetails?.length || 0} members
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-purple-300/70 mb-2">Group ID (share with friends)</p>
              <code className="text-purple-300 bg-purple-500/10 px-3 py-2 rounded block text-sm">
                {group.id}
              </code>
            </div>
            
            <div>
              <p className="text-sm text-purple-300/70 mb-3">Members</p>
              <div className="flex flex-wrap gap-3">
                {group.memberDetails?.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-2 bg-purple-500/10 px-3 py-2 rounded-lg">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={member.profilePicture} />
                      <AvatarFallback className="bg-purple-600 text-white text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-purple-200">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="polls" className="space-y-4">
        <TabsList className="bg-gray-900/90 border border-purple-500/30">
          <TabsTrigger value="polls" className="data-[state=active]:bg-purple-600">Polls</TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600">
            <Bot className="w-4 h-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="data-[state=active]:bg-purple-600">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="polls" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-purple-200">Active Polls</h3>
            <Dialog open={createPollDialogOpen} onOpenChange={setCreatePollDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-purple-500/30">
                <DialogHeader>
                  <DialogTitle className="text-purple-200">Create New Poll</DialogTitle>
                  <DialogDescription className="text-purple-300/70">
                    Ask your group to vote on something
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePoll} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question" className="text-purple-200">Question</Label>
                    <Input
                      id="question"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="What should we do this weekend?"
                      required
                      className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-purple-200">Options</Label>
                    {pollOptions.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Create Poll
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {polls.length === 0 ? (
            <Card className="bg-gray-900/90 border-purple-500/30">
              <CardContent className="py-12 text-center">
                <ThumbsUp className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                <h3 className="text-purple-200 mb-2">No Polls Yet</h3>
                <p className="text-purple-300/70 mb-4">Create a poll to start gathering opinions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => (
                <Card key={poll.id} className="bg-gray-900/90 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-200">{poll.question}</CardTitle>
                    <CardDescription className="text-purple-300/70">
                      Total votes: {poll.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {poll.options.map((option: any) => {
                      const voteCount = option.votes?.length || 0;
                      const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(0) : 0;

                      return (
                        <div key={option.id} className="space-y-2">
                          <div
                            className="relative p-4 bg-gray-800/50 border border-purple-500/30 rounded-lg cursor-pointer hover:border-purple-500/50 transition-all"
                            onClick={() => handleVote(poll.id, option.id)}
                          >
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="relative flex items-center justify-between">
                              <span className="text-purple-200">{option.text}</span>
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                {voteCount} votes ({percentage}%)
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 px-2">
                            {['👍', '❤️', '😂', '🎉', '🔥'].map(emoji => {
                              const count = option.reactions?.[emoji]?.length || 0;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(poll.id, option.id, emoji)}
                                  className="px-2 py-1 bg-gray-800/50 border border-purple-500/20 rounded hover:border-purple-500/50 transition-all text-sm"
                                >
                                  {emoji} {count > 0 && <span className="text-purple-300 ml-1">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card className="bg-gray-900/90 border-purple-500/30 overflow-hidden">
            <div className="h-[600px]">
              <PlanPalBot
                groupId={groupId}
                context={`This is the chat for group "${group?.name}". Help the group coordinate their events, suggest activities, and answer questions about planning.`}
                isInline={true}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card className="bg-gray-900/90 border-purple-500/30">
            <CardContent className="py-12 text-center">
              <p className="text-purple-300">Group-specific suggestions coming soon!</p>
              <p className="text-purple-300/70 text-sm mt-2">Check out the Suggestions tab in the main menu or use the AI Assistant tab!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
