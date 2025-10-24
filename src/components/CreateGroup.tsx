import { useState } from "react";
import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, X, Lock } from "lucide-react";
import { Switch } from "./ui/switch";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface CreateGroupProps {
  onGroupCreated: (group: any) => void;
  currentUserId?: string;
}

export function CreateGroup({ onGroupCreated, currentUserId }: CreateGroupProps) {
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const addMember = () => {
    setMembers([...members, ""]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validMembers = members.filter(m => m.trim() !== "");
    if (!groupName.trim() || validMembers.length === 0) {
      alert("Please enter a group name and at least one member");
      return;
    }

    if (usePassword && !password.trim()) {
      alert("Please enter a password or disable password protection");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            name: groupName,
            members: validMembers,
            password: usePassword ? password : null,
            createdBy: currentUserId,
          }),
        }
      );

      if (response.ok) {
        const group = await response.json();
        onGroupCreated(group);
        setGroupName("");
        setMembers([""]);
        setPassword("");
        setUsePassword(false);
      } else {
        const error = await response.json();
        console.error("Error creating group:", error);
        alert("Failed to create group. Please try again.");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="groupName">Group Name</Label>
        <Input
          id="groupName"
          placeholder="Weekend Warriors, Movie Night Crew, etc."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          disabled={creating}
          className="neon-border"
        />
      </div>

      <div className="space-y-2">
        <Label>Members</Label>
        <div className="space-y-2">
          {members.map((member, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Member name"
                value={member}
                onChange={(e) => updateMember(index, e.target.value)}
                disabled={creating}
                className="neon-border"
              />
              {members.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeMember(index)}
                  disabled={creating}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMember}
          disabled={creating}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="space-y-3 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
        <div className="flex items-center justify-between">
          <Label htmlFor="password-toggle" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password Protection
          </Label>
          <Switch
            id="password-toggle"
            checked={usePassword}
            onCheckedChange={setUsePassword}
            disabled={creating}
          />
        </div>
        
        {usePassword && (
          <div className="space-y-2">
            <Label htmlFor="groupPassword">Group Password</Label>
            <Input
              id="groupPassword"
              type="password"
              placeholder="Enter password for group"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={creating}
              className="neon-border"
            />
            <p className="text-xs text-purple-400">
              Members will need this password to join the group
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={creating} className="w-full gradient-neon neon-glow">
        {creating ? "Creating..." : "Create Group (+50 pts)"}
      </Button>
    </form>
  );
}
