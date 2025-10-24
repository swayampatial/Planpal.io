import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MoodSelector } from "./MoodSelector";
import { SuggestionCard } from "./SuggestionCard";
import { PollComponent } from "./PollComponent";
import { Film, UtensilsCrossed, Sparkles, Search, Plus, CheckCircle, XCircle } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface Group {
  id: string;
  name: string;
  members: string[];
  password?: string | null;
  createdAt: string;
}

interface Event {
  id: string;
  groupId: string;
  title: string;
  date?: string;
  location?: string;
  type?: string;
  mood?: string;
  createdAt: string;
}

interface Poll {
  id: string;
  eventId: string;
  question: string;
  options: any[];
  createdAt: string;
}

interface RSVP {
  eventId: string;
  userId: string;
  status: string;
  timestamp: string;
}

export function EventPlanner({ group, currentUserId, onPointsEarned }: { group: Group; currentUserId: string; onPointsEarned?: () => void }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<"movie" | "food" | "hangout">("movie");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [group.id]);

  useEffect(() => {
    if (selectedEvent) {
      fetchPolls();
      fetchRSVPs();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/events/group/${group.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        if (data.length > 0 && !selectedEvent) {
          setSelectedEvent(data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchPolls = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/polls/event/${selectedEvent.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPolls(data);
      }
    } catch (error) {
      console.error("Error fetching polls:", error);
    }
  };

  const fetchRSVPs = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/rsvps/event/${selectedEvent.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRsvps(data);
      }
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventTitle.trim()) {
      alert("Please enter an event title");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            groupId: group.id,
            title: eventTitle,
            date: eventDate,
            type: eventType,
            mood: selectedMood,
            createdBy: currentUserId,
          }),
        }
      );

      if (response.ok) {
        const event = await response.json();
        setEvents([...events, event]);
        setSelectedEvent(event);
        setEventTitle("");
        setEventDate("");
        setSelectedMood(null);
        onPointsEarned?.(); // Refresh points
      } else {
        const error = await response.json();
        console.error("Error creating event:", error);
        alert("Failed to create event. Please try again.");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!selectedMood) {
      alert("Please select a mood first!");
      return;
    }

    setLoadingSuggestions(true);
    setSuggestions([]);

    try {
      if (eventType === "movie") {
        // Fetch movies based on mood
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/movies/mood/${selectedMood}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } else {
        // Fetch places (using default location for demo)
        const defaultLocation = "40.7128,-74.0060"; // New York City
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/places/search`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              location: defaultLocation,
              type: eventType === "food" ? "restaurant" : "tourist_attraction",
              mood: selectedMood,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      alert("Failed to fetch suggestions. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const searchMovies = async () => {
    if (!searchQuery.trim()) return;

    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/movies/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error searching movies:", error);
      alert("Failed to search movies. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addToPoll = (suggestion: any) => {
    const name = eventType === "movie" ? suggestion.title : suggestion.name;
    if (!pollOptions.includes(name)) {
      setPollOptions([...pollOptions, name]);
    }
  };

  const createPoll = async () => {
    if (!selectedEvent) {
      alert("Please select an event first");
      return;
    }

    if (!pollQuestion.trim() || pollOptions.length < 2) {
      alert("Please enter a question and at least 2 options");
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/polls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            eventId: selectedEvent.id,
            question: pollQuestion,
            options: pollOptions,
            createdBy: currentUserId,
          }),
        }
      );

      if (response.ok) {
        fetchPolls();
        setPollQuestion("");
        setPollOptions([]);
        onPointsEarned?.(); // Refresh points
      }
    } catch (error) {
      console.error("Error creating poll:", error);
      alert("Failed to create poll. Please try again.");
    }
  };

  const updateRSVP = async (status: string) => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/rsvps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            eventId: selectedEvent.id,
            userId: currentUserId,
            status,
          }),
        }
      );

      if (response.ok) {
        fetchRSVPs();
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
    }
  };

  const currentUserRSVP = rsvps.find((r) => r.userId === currentUserId);
  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const maybeCount = rsvps.filter((r) => r.status === "maybe").length;
  const notGoingCount = rsvps.filter((r) => r.status === "not-going").length;

  return (
    <div className="space-y-6">
      {/* Create Event Section */}
      <Card className="bg-purple/80 backdrop-blur-sm border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-900">Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventTitle">Event Title</Label>
              <Input
                id="eventTitle"
                placeholder="Movie Night, Dinner Outing, etc."
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Date (Optional)</Label>
              <Input
                id="eventDate"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label>Event Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={eventType === "movie" ? "default" : "outline"}
                  onClick={() => setEventType("movie")}
                  disabled={creating}
                >
                  <Film className="w-4 h-4 mr-2" />
                  Movie
                </Button>
                <Button
                  type="button"
                  variant={eventType === "food" ? "default" : "outline"}
                  onClick={() => setEventType("food")}
                  disabled={creating}
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Food
                </Button>
                <Button
                  type="button"
                  variant={eventType === "hangout" ? "default" : "outline"}
                  onClick={() => setEventType("hangout")}
                  disabled={creating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Hangout
                </Button>
              </div>
            </div>

            <MoodSelector selectedMood={selectedMood} onMoodSelect={setSelectedMood} />

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Event List */}
      {events.length > 0 && (
        <Card className="bg-purple/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">Your Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedEvent?.id === event.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-purple-200 hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-purple-900">{event.title}</h4>
                      <p className="text-sm text-purple-600">
                        {event.type} • {event.mood || "No mood set"}
                      </p>
                    </div>
                    {event.date && (
                      <p className="text-sm text-purple-600">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <Card className="bg-purple/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">{selectedEvent.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="suggestions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="polls">Polls</TabsTrigger>
                <TabsTrigger value="rsvp">RSVP</TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions" className="space-y-4">
                <div className="space-y-4">
                  {selectedEvent.type === "movie" && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for a movie..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && searchMovies()}
                      />
                      <Button onClick={searchMovies} disabled={loadingSuggestions}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={fetchSuggestions}
                    disabled={loadingSuggestions || !selectedMood}
                    className="w-full"
                  >
                    {loadingSuggestions ? "Loading..." : "Get Smart Suggestions"}
                  </Button>

                  {suggestions.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {suggestions.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          type={selectedEvent.type === "movie" ? "movie" : "place"}
                          onAddToPoll={addToPoll}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="polls" className="space-y-4">
                {/* Create Poll */}
                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-purple-900">Create a Poll</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Poll question (e.g., Which movie should we watch?)"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                    />
                    
                    {pollOptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-purple-600">Options:</p>
                        {pollOptions.map((option, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                            <span className="text-purple-900">{option}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPollOptions(pollOptions.filter((_: any, i: any) => i !== index))}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button onClick={createPoll} disabled={pollOptions.length < 2} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Poll
                    </Button>
                  </CardContent>
                </Card>

                {/* Display Polls */}
                {polls.length > 0 ? (
                  <div className="space-y-4">
                    {polls.map((poll) => (
                      <PollComponent
                        key={poll.id}
                        poll={poll}
                        currentUserId={currentUserId}
                        onVoteAdded={fetchPolls}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-purple-600 py-8">
                    No polls yet. Create one above!
                  </p>
                )}
              </TabsContent>

              <TabsContent value="rsvp" className="space-y-4">
                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-purple-900">RSVP Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-900">{goingCount}</p>
                        <p className="text-xs text-green-600">Going</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <Sparkles className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                        <p className="text-yellow-900">{maybeCount}</p>
                        <p className="text-xs text-yellow-600">Maybe</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <p className="text-red-900">{notGoingCount}</p>
                        <p className="text-xs text-red-600">Not Going</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-purple-600">Your Response:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={currentUserRSVP?.status === "going" ? "default" : "outline"}
                          onClick={() => updateRSVP("going")}
                          className={currentUserRSVP?.status === "going" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          Going
                        </Button>
                        <Button
                          variant={currentUserRSVP?.status === "maybe" ? "default" : "outline"}
                          onClick={() => updateRSVP("maybe")}
                          className={currentUserRSVP?.status === "maybe" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                        >
                          Maybe
                        </Button>
                        <Button
                          variant={currentUserRSVP?.status === "not-going" ? "default" : "outline"}
                          onClick={() => updateRSVP("not-going")}
                          className={currentUserRSVP?.status === "not-going" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                          Can't Go
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
