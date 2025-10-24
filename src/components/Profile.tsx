import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Camera, Save, Coins } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface ProfileProps {
  user: any;
  profile: any;
  onProfileUpdate: (profile: any) => void;
}

export function Profile({ user, profile, onProfileUpdate }: ProfileProps) {
  const [name, setName] = useState(profile?.name || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/profile/${user.id}/upload`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              imageData: base64,
              fileName: file.name,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const { url } = await response.json();
        
        // Update profile with new image
        const updatedProfile = { ...profile, profileImage: url };
        onProfileUpdate(updatedProfile);
        
        alert("Profile picture updated!");
      };
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/profile/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedProfile = await response.json();
      onProfileUpdate(updatedProfile);
      alert("Profile updated!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <Card className="neon-glow border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-purple-500 neon-glow">
                <AvatarImage src={profile?.profileImage || undefined} alt={profile?.name} />
                <AvatarFallback className="text-3xl bg-gradient-neon text-white">
                  {getInitials(profile?.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 rounded-full neon-glow gradient-neon"
              >
                <Camera className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {uploading && <p className="text-sm text-purple-400">Uploading...</p>}
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className="neon-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="opacity-50"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving || name === profile?.name}
              className="w-full gradient-neon neon-glow"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Points Display */}
          <div className="p-6 bg-gradient-neon rounded-xl neon-glow text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="w-8 h-8 text-yellow-300" />
              <span className="text-4xl font-bold text-white">{profile?.points || 0}</span>
            </div>
            <p className="text-white/80">PlanPal Points</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
