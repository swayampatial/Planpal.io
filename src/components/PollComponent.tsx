import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface Vote {
  userId: string;
  emoji: string;
  timestamp: string;
}

interface PollOption {
  text: string;
  votes: Vote[];
}

interface Poll {
  id: string;
  eventId: string;
  question: string;
  options: PollOption[];
  createdAt: string;
}

interface PollComponentProps {
  poll: Poll;
  currentUserId: string;
  onVoteAdded?: () => void;
}

const emojiOptions = ["👍", "❤️", "🔥", "🎉", "😍", "👏", "✨", "🌟"];

export function PollComponent({ poll, currentUserId, onVoteAdded }: PollComponentProps) {
  const [selectedEmoji, setSelectedEmoji] = useState("👍");
  const [voting, setVoting] = useState(false);

  const handleVote = async (optionIndex: number) => {
    setVoting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/polls/${poll.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            optionIndex,
            userId: currentUserId,
            emoji: selectedEmoji,
          }),
        }
      );

      if (response.ok) {
        onVoteAdded?.();
      } else {
        const error = await response.json();
        console.error("Error voting:", error);
        alert("Failed to vote. Please try again.");
      }
    } catch (error) {
      console.error("Error voting:", error);
      alert("Failed to vote. Please try again.");
    } finally {
      setVoting(false);
    }
  };

  const getTotalVotes = (option: PollOption) => option.votes.length;

  const getEmojiCount = (option: PollOption) => {
    const emojiCounts: Record<string, number> = {};
    option.votes.forEach((vote) => {
      emojiCounts[vote.emoji] = (emojiCounts[vote.emoji] || 0) + 1;
    });
    return emojiCounts;
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-900">{poll.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Emoji Selector */}
        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
          <span className="text-sm text-purple-600">Vote with:</span>
          <div className="flex gap-1">
            {emojiOptions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={`text-2xl p-2 rounded-lg transition-all ${
                  selectedEmoji === emoji
                    ? "bg-purple-200 scale-110"
                    : "hover:bg-purple-100"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Poll Options */}
        <div className="space-y-3">
          {poll.options.map((option, index) => {
            const totalVotes = getTotalVotes(option);
            const emojiCounts = getEmojiCount(option);
            const hasVoted = option.votes.some((v) => v.userId === currentUserId);

            return (
              <div
                key={index}
                className="border border-purple-200 rounded-lg p-4 hover:border-purple-400 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-900">{option.text}</span>
                  <Badge className="bg-purple-100 text-purple-700">
                    {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                  </Badge>
                </div>

                {/* Emoji Reactions Display */}
                {totalVotes > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(emojiCounts).map(([emoji, count]) => (
                      <Badge
                        key={emoji}
                        variant="secondary"
                        className="bg-purple-50 text-purple-700"
                      >
                        {emoji} {count}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => handleVote(index)}
                  disabled={voting}
                  variant={hasVoted ? "secondary" : "default"}
                  className="w-full"
                >
                  {voting ? "Voting..." : hasVoted ? "Vote Again" : `Vote ${selectedEmoji}`}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
