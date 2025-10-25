import { useState, useEffect, useRef } from "react";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Bot,
  Send,
  Film,
  UtensilsCrossed,
  MapPin,
  Sparkles,
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  timestamp: string;
}

export function PlanPalBot({ group }: { group: Group }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "bot",
      text: `Hey ${group.members[0]}! 👋 I'm PlanPal, your smart event planning assistant! I can help you find the perfect movie, restaurant, or hangout spot based on your group's preferences. What kind of event are you planning?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { icon: Film, label: "Movie Night", type: "movie", mood: "chill" },
    {
      icon: UtensilsCrossed,
      label: "Dinner Out",
      type: "food",
      mood: "foodie",
    },
    {
      icon: Sparkles,
      label: "Adventure",
      type: "hangout",
      mood: "adventurous",
    },
    { icon: MapPin, label: "Chill Spot", type: "hangout", mood: "chill" },
  ];

  const handleQuickAction = async (action: (typeof quickActions)[0]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: `I want to plan a ${action.label.toLowerCase()}`,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setSending(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/planpal/suggest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            groupId: group.id,
            eventType: action.type,
            mood: action.mood,
            memberLocations: [],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        const botMessages: Message[] = data.suggestions.map(
          (suggestion: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            type: "bot" as const,
            text: suggestion.text,
            timestamp: suggestion.timestamp,
          })
        );

        // Add additional context
        botMessages.push({
          id: `${Date.now()}-final`,
          type: "bot",
          text: `Head over to the Events tab to get personalized suggestions and create a poll for your group! 🎯`,
          timestamp: new Date().toISOString(),
        });

        setMessages([...messages, userMessage, ...botMessages]);
      }
    } catch (error) {
      console.error("Error getting bot suggestions:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "bot",
        text: "Oops! Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, userMessage, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setInputMessage("");

    // Simple response logic
    const lowerMessage = inputMessage.toLowerCase();
    let botResponse = "";

    if (lowerMessage.includes("movie") || lowerMessage.includes("film")) {
      botResponse =
        "Great! 🎬 I can help you find the perfect movie. What's your group's mood? Chill, adventurous, romantic, scary, or dramatic? Head to the Events tab to explore movies by mood!";
    } else if (
      lowerMessage.includes("food") ||
      lowerMessage.includes("restaurant") ||
      lowerMessage.includes("eat")
    ) {
      botResponse =
        "Yum! 🍽️ I'll help you find the best restaurants nearby. Are you in a foodie mood or looking for something specific? Check out the Events tab to get location-based suggestions!";
    } else if (
      lowerMessage.includes("hangout") ||
      lowerMessage.includes("activity") ||
      lowerMessage.includes("fun")
    ) {
      botResponse =
        "Awesome! ✨ Let's find something fun to do! Whether you're feeling adventurous or want something chill, I've got you covered. Visit the Events tab to explore options!";
    } else if (
      lowerMessage.includes("help") ||
      lowerMessage.includes("what can you do")
    ) {
      botResponse =
        "I can help you:\n\n🎬 Find movies based on your group's mood\n🍽️ Discover restaurants and cafes nearby\n✨ Suggest fun hangout activities\n📊 Create polls to let your group vote\n📍 Find best-rated spots near all members\n\nJust tell me what you're planning!";
    } else {
      botResponse =
        "I'm here to help with event planning! Try asking me about movies, restaurants, or hangout activities. Or use the quick action buttons below! 😊";
    }

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      text: botResponse,
      timestamp: new Date().toISOString(),
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, botMessage]);
    }, 500);
  };

  return (
    <Card className="bg-purple/80 backdrop-blur-sm  flex flex-col">
      <CardHeader className="border-b border-purple-100">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          PlanPal Bot
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-100 text-purple-900"
                }`}
              >
                {message.type === "bot" && (
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-purple-600">PlanPal</span>
                  </div>
                )}
                <p className="whitespace-pre-line">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.type === "user"
                      ? "text-purple-200"
                      : "text-purple-500"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-purple-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-purple-100 p-4 bg-purple-50/50">
          <p className="text-xs text-purple-600 mb-2">Quick Actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  disabled={sending}
                  className="justify-start"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-purple-100 p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask PlanPal anything..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !inputMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}